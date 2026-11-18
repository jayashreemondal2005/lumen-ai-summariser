// Server-side page fetcher with SSRF protection.
//
// - Every hop (including redirects) is re-validated with validateTargetUrl().
// - DNS answers are checked at connect time through a custom `lookup`, so a
//   host that resolves to a private address (or re-binds to one) is refused.
// - Hard limits on time, redirects and decompressed size.

import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import zlib from "node:zlib";
import type { LookupFunction } from "node:net";
import { Readable } from "node:stream";
import { UrlGuardError, isBlockedAddress, validateTargetUrl } from "./url-guard";

export type FetchErrorCode =
  | "INVALID_URL"
  | "BLOCKED_HOST"
  | "DNS_FAILED"
  | "TIMEOUT"
  | "TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "HTTP_ERROR"
  | "TOO_MANY_REDIRECTS"
  | "NETWORK";

export class FetchPageError extends Error {
  constructor(
    public readonly code: FetchErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "FetchPageError";
  }
}

export interface FetchedPage {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  html: string;
  bytes: number;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** DNS resolver used by the guarded lookup. Injected in tests. */
  lookupImpl?: typeof dns.lookup;
  /**
   * Test seams only (never set in app code): replace the URL validator for
   * the first hop and the connect-time lookup, so the fetch loop can be
   * exercised against a local server. Redirect targets are always checked
   * with the real validator.
   */
  firstHopValidator?: (u: string) => URL;
  connectLookup?: LookupFunction;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; LumenSummariser/1.0; +https://github.com/jayashreemondal2005/lumen-ai-summariser)";

const ACCEPTED_TYPES = ["text/html", "application/xhtml+xml", "text/plain"];

/** A dns.lookup wrapper that refuses private, loopback and reserved answers. */
export function createGuardedLookup(lookupImpl: typeof dns.lookup = dns.lookup): LookupFunction {
  return (hostname, options, callback) => {
    lookupImpl(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
      if (err) return callback(err, "", 4);
      const list = (Array.isArray(addresses) ? addresses : []) as dns.LookupAddress[];
      if (list.length === 0) {
        const e = Object.assign(new Error(`No addresses for ${hostname}`), { code: "ENOTFOUND" });
        return callback(e, "", 4);
      }
      // Refuse if ANY answer is internal: mixed answers are a rebinding trick.
      const bad = list.find((a) => isBlockedAddress(a.address));
      if (bad) {
        const e = Object.assign(new Error(`Blocked address for ${hostname}`), { code: "EBLOCKED" });
        return callback(e, "", 4);
      }
      if ((options as dns.LookupOptions).all) {
        (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
      } else {
        const first = list[0]!;
        callback(null, first.address, first.family);
      }
    });
  };
}

function decoderFor(encoding: string | undefined): NodeJS.ReadWriteStream | null {
  switch ((encoding || "").trim().toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return zlib.createGunzip();
    case "deflate":
      return zlib.createInflate();
    case "br":
      return zlib.createBrotliDecompress();
    case "":
    case "identity":
      return null;
    default:
      return null;
  }
}

export function detectCharset(contentType: string, head: Buffer): string {
  const fromHeader = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType)?.[1];
  if (fromHeader) return fromHeader.toLowerCase();
  const sniff = head.subarray(0, 4096).toString("latin1");
  const meta =
    /<meta[^>]+charset\s*=\s*["']?\s*([\w.:-]+)/i.exec(sniff)?.[1] ||
    /<meta[^>]+content\s*=\s*["'][^"']*charset=([\w.:-]+)/i.exec(sniff)?.[1];
  return (meta || "utf-8").toLowerCase();
}

export function decodeBody(buf: Buffer, contentType: string): string {
  const charset = detectCharset(contentType, buf);
  try {
    return new TextDecoder(charset, { fatal: false }).decode(buf);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }
}

interface HopResult {
  status: number;
  headers: http.IncomingHttpHeaders;
  body?: Buffer;
}

function requestOnce(
  url: URL,
  lookup: LookupFunction,
  maxBytes: number,
  signal: AbortSignal,
): Promise<HopResult> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method: "GET",
        lookup,
        signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.1",
          "Accept-Language": "en-IN,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
        },
        // Never send cookies or auth; never reuse sockets across hosts.
        agent: false,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, headers: res.headers });
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return resolve({ status, headers: res.headers });
        }

        const contentType = String(res.headers["content-type"] || "").toLowerCase();
        if (contentType && !ACCEPTED_TYPES.some((t) => contentType.startsWith(t))) {
          res.resume();
          const kind = contentType.split(";")[0];
          return reject(
            new FetchPageError(
              "UNSUPPORTED_TYPE",
              kind === "application/pdf"
                ? "This link is a PDF. Lumen summarises web pages (HTML) for now."
                : `This link isn't a web page (it returned ${kind}).`,
            ),
          );
        }
        const declared = Number(res.headers["content-length"] || 0);
        if (declared && declared > maxBytes * 2) {
          res.resume();
          return reject(new FetchPageError("TOO_LARGE", "This page is too large to summarise."));
        }

        const decoder = decoderFor(res.headers["content-encoding"] as string | undefined);
        const stream: Readable = decoder ? (res.pipe(decoder) as unknown as Readable) : res;
        const chunks: Buffer[] = [];
        let total = 0;
        stream.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > maxBytes) {
            // Keep what we have; a truncated page is still useful.
            stream.removeAllListeners("data");
            res.destroy();
            resolve({ status, headers: res.headers, body: Buffer.concat(chunks) });
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }));
        stream.on("error", (e) => reject(e));
        res.on("error", (e) => reject(e));
      },
    );
    const onAbort = () => {
      req.destroy();
      reject(new FetchPageError("TIMEOUT", "The site took too long to respond."));
    };
    if (signal.aborted) return onAbort();
    // Late aborts after completion are harmless (settled promise, finished request).
    signal.addEventListener("abort", onAbort, { once: true });
    req.on("error", reject);
    req.end();
  });
}

function mapNetworkError(err: unknown): FetchPageError {
  if (err instanceof FetchPageError) return err;
  if (err instanceof UrlGuardError) {
    return new FetchPageError(err.code === "BLOCKED_HOST" || err.code === "BLOCKED_PORT" ? "BLOCKED_HOST" : "INVALID_URL", err.message);
  }
  const e = err as NodeJS.ErrnoException & { name?: string };
  if (e?.name === "AbortError" || e?.code === "ABORT_ERR" || e?.code === "ETIMEDOUT") {
    return new FetchPageError("TIMEOUT", "The site took too long to respond.");
  }
  if (e?.code === "EBLOCKED") {
    return new FetchPageError("BLOCKED_HOST", "That address points to a private or reserved network, so Lumen won't open it.");
  }
  if (e?.code === "ENOTFOUND" || e?.code === "EAI_AGAIN" || e?.code === "ENODATA") {
    return new FetchPageError("DNS_FAILED", "We couldn't find that website. Check the address for typos.");
  }
  if (e?.code === "ECONNREFUSED" || e?.code === "ECONNRESET" || e?.code === "EHOSTUNREACH") {
    return new FetchPageError("NETWORK", "The website refused the connection.");
  }
  if (typeof e?.code === "string" && (e.code.startsWith("ERR_TLS") || e.code.includes("CERT"))) {
    return new FetchPageError("NETWORK", "The website's security certificate couldn't be verified.");
  }
  return new FetchPageError("NETWORK", "We couldn't reach that website.");
}

function httpErrorMessage(status: number): string {
  if (status === 401 || status === 403) return "The website blocked automated access to this page.";
  if (status === 404 || status === 410) return "That page doesn't exist (the site returned 404).";
  if (status === 429) return "The website is rate-limiting requests. Try again in a minute.";
  if (status >= 500) return `The website had a problem (error ${status}). Try again later.`;
  return `The website returned an unexpected response (${status}).`;
}

export async function safeFetchPage(input: string, opts: SafeFetchOptions = {}): Promise<FetchedPage> {
  const timeoutMs = opts.timeoutMs ?? 9000;
  const maxBytes = opts.maxBytes ?? 3_000_000;
  const maxRedirects = opts.maxRedirects ?? 5;
  const lookup = opts.connectLookup ?? createGuardedLookup(opts.lookupImpl);
  const signal = AbortSignal.timeout(timeoutMs);

  let current: URL;
  try {
    current = (opts.firstHopValidator ?? validateTargetUrl)(input);
  } catch (err) {
    throw mapNetworkError(err);
  }
  const requestedUrl = current.toString();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let res: HopResult;
    try {
      res = await requestOnce(current, lookup, maxBytes, signal);
    } catch (err) {
      throw mapNetworkError(err);
    }

    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      if (hop === maxRedirects) {
        throw new FetchPageError("TOO_MANY_REDIRECTS", "The page redirected too many times.");
      }
      try {
        current = validateTargetUrl(new URL(String(res.headers.location), current));
      } catch (err) {
        throw mapNetworkError(err);
      }
      continue;
    }

    if (res.status < 200 || res.status >= 300 || !res.body) {
      throw new FetchPageError("HTTP_ERROR", httpErrorMessage(res.status), res.status);
    }

    const contentType = String(res.headers["content-type"] || "text/html");
    return {
      requestedUrl,
      finalUrl: current.toString(),
      status: res.status,
      contentType,
      html: decodeBody(res.body, contentType),
      bytes: res.body.length,
    };
  }
  throw new FetchPageError("TOO_MANY_REDIRECTS", "The page redirected too many times.");
}
