import { describe, expect, it } from "vitest";
import {
  UrlGuardError,
  expandIPv6,
  isBlockedAddress,
  isBlockedIPv4,
  isBlockedIPv6,
  normaliseUserUrl,
  validateTargetUrl,
} from "@/lib/server/url-guard";

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof UrlGuardError ? e.code : "OTHER";
  }
}

describe("normaliseUserUrl", () => {
  it("adds https:// to bare domains and paths", () => {
    expect(normaliseUserUrl("example.com/article")).toBe("https://example.com/article");
    expect(normaliseUserUrl("  www.example.org  ")).toBe("https://www.example.org/");
  });

  it("keeps explicit http and https", () => {
    expect(normaliseUserUrl("http://example.com/a?b=1")).toBe("http://example.com/a?b=1");
    expect(normaliseUserUrl("HTTPS://Example.COM/Path")).toBe("https://example.com/Path");
  });

  it("drops fragments", () => {
    expect(normaliseUserUrl("https://example.com/a#section")).toBe("https://example.com/a");
  });

  it("rejects empty input and spaces", () => {
    expect(codeOf(() => normaliseUserUrl(""))).toBe("INVALID_URL");
    expect(codeOf(() => normaliseUserUrl("exa mple.com"))).toBe("INVALID_URL");
  });

  it("treats host:port as a host, then refuses non-standard ports", () => {
    expect(codeOf(() => normaliseUserUrl("example.com:8080/x"))).toBe("BLOCKED_PORT");
  });
});

describe("validateTargetUrl: schemes, credentials, ports", () => {
  it.each(["ftp://example.com", "file:///etc/passwd", "javascript:alert(1)", "data:text/html,hi", "gopher://example.com"])(
    "refuses %s",
    (u) => {
      expect(codeOf(() => validateTargetUrl(u))).toMatch(/UNSUPPORTED_SCHEME|INVALID_URL/);
    },
  );

  it("refuses credentials in the URL", () => {
    expect(codeOf(() => validateTargetUrl("https://user:pass@example.com"))).toBe("INVALID_URL");
  });

  it.each(["https://example.com:22", "http://example.com:6379", "http://example.com:8080"])("refuses non-web port %s", (u) => {
    expect(codeOf(() => validateTargetUrl(u))).toBe("BLOCKED_PORT");
  });

  it("allows 80 and 443 explicitly", () => {
    expect(validateTargetUrl("http://example.com:80/").hostname).toBe("example.com");
    expect(validateTargetUrl("https://example.com:443/").hostname).toBe("example.com");
  });
});

describe("validateTargetUrl: SSRF host checks", () => {
  it.each([
    "http://localhost/",
    "http://LOCALHOST:80/",
    "http://app.localhost/",
    "http://printer.local/",
    "http://db.internal/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://intranet/",
    "http://router.lan/",
    "http://nas.home.arpa/",
  ])("refuses internal host name %s", (u) => {
    expect(codeOf(() => validateTargetUrl(u))).toBe("BLOCKED_HOST");
  });

  it.each([
    "http://127.0.0.1/",
    "http://127.1/",
    "http://2130706433/", // decimal 127.0.0.1
    "http://0x7f000001/", // hex
    "http://0177.0.0.1/", // octal
    "http://0.0.0.0/",
    "http://10.0.0.5/",
    "http://172.16.10.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.1/",
    "http://198.18.0.1/",
    "http://224.0.0.1/",
    "http://255.255.255.255/",
    "http://[::1]/",
    "http://[::]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/",
    "http://[fc00::1]/",
    "http://[fd12:3456::1]/",
    "http://[fe80::1]/",
    "http://[64:ff9b::a00:1]/",
    "http://[2001:db8::1]/",
  ])("refuses private or reserved address %s", (u) => {
    expect(codeOf(() => validateTargetUrl(u))).toBe("BLOCKED_HOST");
  });

  it("allows public IPs and normal hosts", () => {
    expect(validateTargetUrl("http://93.184.215.14/").hostname).toBe("93.184.215.14");
    expect(validateTargetUrl("http://[2606:4700:4700::1111]/").hostname).toBe("[2606:4700:4700::1111]");
    expect(validateTargetUrl("https://en.wikipedia.org/wiki/Kolkata").hostname).toBe("en.wikipedia.org");
  });

  it("accepts internationalised domains (punycode)", () => {
    expect(validateTargetUrl("https://bücher.example.org/").hostname).toBe("xn--bcher-kva.example.org");
  });

  it("refuses malformed hosts", () => {
    expect(codeOf(() => validateTargetUrl("http://1.2.3.4.5/"))).not.toBeNull();
    expect(codeOf(() => validateTargetUrl("http://exa_mple.com/"))).toBe("INVALID_URL");
  });
});

describe("IP classification", () => {
  it("classifies IPv4", () => {
    expect(isBlockedIPv4("8.8.8.8")).toBe(false);
    expect(isBlockedIPv4("1.1.1.1")).toBe(false);
    expect(isBlockedIPv4("172.15.255.255")).toBe(false);
    expect(isBlockedIPv4("172.32.0.0")).toBe(false);
    expect(isBlockedIPv4("172.16.0.0")).toBe(true);
    expect(isBlockedIPv4("100.127.255.255")).toBe(true);
    expect(isBlockedIPv4("100.128.0.0")).toBe(false);
    expect(isBlockedIPv4("not-an-ip")).toBe(true);
  });

  it("expands IPv6 forms", () => {
    expect(expandIPv6("::1")).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(expandIPv6("2001:db8::")).toEqual([0x2001, 0xdb8, 0, 0, 0, 0, 0, 0]);
    expect(expandIPv6("::ffff:10.0.0.1")).toEqual([0, 0, 0, 0, 0, 0xffff, 0x0a00, 0x0001]);
    expect(expandIPv6("fe80::1%eth0")).toEqual([0xfe80, 0, 0, 0, 0, 0, 0, 1]);
    expect(expandIPv6("1:2:3")).toBeNull();
    expect(expandIPv6("1::2::3")).toBeNull();
  });

  it("classifies IPv6", () => {
    expect(isBlockedIPv6("2606:4700:4700::1111")).toBe(false);
    expect(isBlockedIPv6("2a00:1450:4001:80b::200e")).toBe(false);
    expect(isBlockedIPv6("::ffff:8.8.8.8")).toBe(false);
    expect(isBlockedIPv6("::ffff:192.168.0.1")).toBe(true);
    expect(isBlockedIPv6("2001::1")).toBe(true); // Teredo
    expect(isBlockedIPv6("2002:c0a8:0101::1")).toBe(true); // 6to4
    expect(isBlockedIPv6("ff02::1")).toBe(true);
  });

  it("isBlockedAddress refuses non-IPs", () => {
    expect(isBlockedAddress("example.com")).toBe(true);
    expect(isBlockedAddress("[::1]")).toBe(true);
    expect(isBlockedAddress("8.8.4.4")).toBe(false);
  });
});
