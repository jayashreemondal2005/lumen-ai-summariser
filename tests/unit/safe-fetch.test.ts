import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import zlib from "node:zlib";
import type dns from "node:dns";
import type { AddressInfo } from "node:net";
import { FetchPageError, createGuardedLookup, decodeBody, detectCharset, safeFetchPage } from "@/lib/server/safe-fetch";

type LookupCb = (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void;

/** Fake DNS: maps host names to answers. */
function fakeDns(table: Record<string, string[]>): typeof dns.lookup {
  return ((host: string, _opts: unknown, cb: LookupCb) => {
    const list = table[host];
    if (!list) return cb(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }), []);
    cb(null, list.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })));
  }) as unknown as typeof dns.lookup;
}

function runLookup(lookup: ReturnType<typeof createGuardedLookup>, host: string, all = false) {
  return new Promise<{ err: NodeJS.ErrnoException | null; address: unknown }>((resolve) => {
    lookup(host, { all } as never, ((err: NodeJS.ErrnoException | null, address: unknown) => resolve({ err, address })) as never);
  });
}

describe("createGuardedLookup (DNS rebinding defence)", () => {
  const lookup = createGuardedLookup(
    fakeDns({
      "public.example": ["93.184.215.14"],
      "rebind.example": ["93.184.215.14", "127.0.0.1"],
      "internal.example": ["10.1.2.3"],
      "meta.example": ["169.254.169.254"],
      "v6.example": ["2606:4700::1"],
      "v6local.example": ["::1"],
    }),
  );

  it("passes public answers through", async () => {
    const r = await runLookup(lookup, "public.example");
    expect(r.err).toBeNull();
    expect(r.address).toBe("93.184.215.14");
  });

  it("returns all answers when asked", async () => {
    const r = await runLookup(lookup, "v6.example", true);
    expect(r.err).toBeNull();
    expect(r.address).toEqual([{ address: "2606:4700::1", family: 6 }]);
  });

  it.each(["rebind.example", "internal.example", "meta.example", "v6local.example"])("blocks %s", async (host) => {
    const r = await runLookup(lookup, host);
    expect(r.err?.code).toBe("EBLOCKED");
  });

  it("reports unknown hosts", async () => {
    const r = await runLookup(lookup, "nope.example");
    expect(r.err?.code).toBe("ENOTFOUND");
  });
});

describe("charset handling", () => {
  it("reads charset from the header, then meta, then defaults to utf-8", () => {
    expect(detectCharset("text/html; charset=ISO-8859-1", Buffer.from(""))).toBe("iso-8859-1");
    expect(detectCharset("text/html", Buffer.from('<meta charset="windows-1252">'))).toBe("windows-1252");
    expect(detectCharset("text/html", Buffer.from('<meta http-equiv="Content-Type" content="text/html; charset=shift_jis">'))).toBe("shift_jis");
    expect(detectCharset("text/html", Buffer.from("<p>hi</p>"))).toBe("utf-8");
  });

  it("decodes latin-1 bodies", () => {
    const buf = Buffer.from([0x63, 0x61, 0x66, 0xe9]); // "café" in latin-1
    expect(decodeBody(buf, "text/html; charset=iso-8859-1")).toBe("café");
  });
});

describe("safeFetchPage against a local test server", () => {
  let server: http.Server;
  let port = 0;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/ok") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<html><body><p>Hello</p></body></html>");
      } else if (req.url === "/gzip") {
        res.writeHead(200, { "Content-Type": "text/html", "Content-Encoding": "gzip" });
        res.end(zlib.gzipSync("<p>compressed body</p>"));
      } else if (req.url === "/pdf") {
        res.writeHead(200, { "Content-Type": "application/pdf" });
        res.end("%PDF-1.7");
      } else if (req.url === "/big") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("x".repeat(50_000));
      } else if (req.url === "/to-internal") {
        res.writeHead(302, { Location: "http://169.254.169.254/latest/meta-data/" });
        res.end();
      } else if (req.url === "/loop") {
        res.writeHead(302, { Location: "/loop" });
        res.end();
      } else if (req.url === "/slow") {
        setTimeout(() => {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("late");
        }, 2000);
      } else if (req.url === "/forbidden") {
        res.writeHead(403);
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("refuses loopback targets before connecting (real SSRF attempt)", async () => {
    await expect(safeFetchPage(`http://127.0.0.1:${port}/ok`)).rejects.toMatchObject({ code: "BLOCKED_HOST" });
    await expect(safeFetchPage(`http://localhost/ok`)).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("refuses a public-looking name that resolves to loopback", async () => {
    // The test server listens on 127.0.0.1; a fake DNS points a public name at it.
    const lookupImpl = fakeDns({ "evil.example.com": ["127.0.0.1"] });
    await expect(safeFetchPage("http://evil.example.com/ok", { lookupImpl })).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  // The remaining cases exercise the fetch loop itself against the local
  // server. Only the FIRST hop bypasses the guard (via test seams); every
  // redirect target still goes through the real validator.
  const seams = () => ({
    firstHopValidator: (u: string) => new URL(u),
    connectLookup: ((_h: string, o: { all?: boolean }, cb: (e: null, a: unknown, f?: number) => void) =>
      o?.all ? cb(null, [{ address: "127.0.0.1", family: 4 }]) : cb(null, "127.0.0.1", 4)) as never,
  });
  const url = (p: string) => `http://127.0.0.1:${port}${p}`;

  it("fetches and decodes a normal page", async () => {
    const page = await safeFetchPage(url("/ok"), seams());
    expect(page.status).toBe(200);
    expect(page.html).toContain("Hello");
  });

  it("decompresses gzip bodies", async () => {
    const page = await safeFetchPage(url("/gzip"), seams());
    expect(page.html).toContain("compressed body");
  });

  it("rejects PDFs with a clear message", async () => {
    await expect(safeFetchPage(url("/pdf"), seams())).rejects.toMatchObject({ code: "UNSUPPORTED_TYPE" });
  });

  it("caps the body size instead of reading everything", async () => {
    const page = await safeFetchPage(url("/big"), { ...seams(), maxBytes: 10_000 });
    expect(page.bytes).toBeLessThanOrEqual(10_000 + 65_536); // at most one extra chunk is dropped
    expect(page.html.length).toBeLessThan(50_000);
  });

  it("re-validates redirects: a redirect to cloud metadata is blocked", async () => {
    await expect(safeFetchPage(url("/to-internal"), seams())).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("re-validates redirects: a redirect back to a non-standard local port is blocked", async () => {
    await expect(safeFetchPage(url("/loop"), seams())).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("times out slow sites", async () => {
    await expect(safeFetchPage(url("/slow"), { ...seams(), timeoutMs: 400 })).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("maps 403 and 404 to friendly HTTP errors", async () => {
    const e403 = await safeFetchPage(url("/forbidden"), seams()).catch((e) => e);
    expect(e403).toBeInstanceOf(FetchPageError);
    expect(e403).toMatchObject({ code: "HTTP_ERROR", status: 403 });
    expect(e403.message).toMatch(/blocked automated access/i);
    const e404 = await safeFetchPage(url("/missing"), seams()).catch((e) => e);
    expect(e404).toMatchObject({ code: "HTTP_ERROR", status: 404 });
  });
});
