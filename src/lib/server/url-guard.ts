// URL validation and SSRF protection.
//
// Two layers:
//  1. validateTargetUrl() checks the URL itself (scheme, credentials, port,
//     host name, literal IPs) before any network activity.
//  2. isBlockedAddress() is applied to every address DNS returns, at connect
//     time (see safe-fetch.ts), so DNS rebinding cannot reach internal hosts.

import { isIP } from "node:net";

export type UrlGuardCode = "INVALID_URL" | "UNSUPPORTED_SCHEME" | "BLOCKED_HOST" | "BLOCKED_PORT";

export class UrlGuardError extends Error {
  constructor(
    public readonly code: UrlGuardCode,
    message: string,
  ) {
    super(message);
    this.name = "UrlGuardError";
  }
}

const ALLOWED_PORTS = new Set(["", "80", "443"]);

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".localdomain",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".home.arpa",
  ".corp",
  ".private",
  ".test",
  ".invalid",
  ".example",
  ".onion",
  ".arpa",
];

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "kubernetes",
  "kubernetes.default",
]);

/**
 * Accepts what people actually type ("example.com/page", " https://x.org ")
 * and returns a normalised absolute URL string, or throws UrlGuardError.
 */
export function normaliseUserUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new UrlGuardError("INVALID_URL", "Enter a web address.");
  if (/\s/.test(trimmed)) throw new UrlGuardError("INVALID_URL", "Web addresses can't contain spaces.");
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  // "example.com:8080" looks like a scheme; treat bare host:port as a host.
  const looksLikeHostPort = /^[^/:]+\.[^/:]+:\d+/.test(trimmed);
  const candidate = hasScheme && !looksLikeHostPort ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;
  return validateTargetUrl(candidate).toString();
}

/** Synchronous checks on a URL before it is fetched. Returns the parsed URL. */
export function validateTargetUrl(raw: string | URL): URL {
  let url: URL;
  try {
    url = raw instanceof URL ? new URL(raw.toString()) : new URL(raw);
  } catch {
    throw new UrlGuardError("INVALID_URL", "That doesn't look like a valid web address.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlGuardError("UNSUPPORTED_SCHEME", "Only http and https web pages can be summarised.");
  }
  if (url.username || url.password) {
    throw new UrlGuardError("INVALID_URL", "Addresses with a username or password aren't allowed.");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new UrlGuardError("BLOCKED_PORT", "Only standard web ports (80 and 443) are allowed.");
  }

  // WHATWG URL parsing already lower-cases, punycodes and normalises numeric
  // IPv4 forms (e.g. http://2130706433 -> 127.0.0.1, http://0x7f.1 -> 127.0.0.1).
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host || host.length > 253) {
    throw new UrlGuardError("INVALID_URL", "That doesn't look like a valid web address.");
  }

  if (isIP(host)) {
    if (isBlockedAddress(host)) {
      throw new UrlGuardError("BLOCKED_HOST", "Private, local and reserved network addresses can't be summarised.");
    }
    url.hash = "";
    return url;
  }

  if (!host.includes(".")) {
    throw new UrlGuardError("BLOCKED_HOST", "Use a full public web address, like example.com.");
  }
  if (BLOCKED_HOSTS.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new UrlGuardError("BLOCKED_HOST", "Local and internal addresses can't be summarised.");
  }
  if (!/^[a-z0-9.-]+$/.test(host) || host.split(".").some((label) => !label || label.length > 63)) {
    throw new UrlGuardError("INVALID_URL", "That doesn't look like a valid web address.");
  }
  const tld = host.slice(host.lastIndexOf(".") + 1);
  if (/^\d+$/.test(tld)) {
    // Numeric TLD that isn't a valid IPv4 literal (e.g. 1.2.3.4.5).
    throw new UrlGuardError("INVALID_URL", "That doesn't look like a valid web address.");
  }

  url.hash = "";
  return url;
}

/* ------------------------------------------------------------------ */
/* IP classification                                                   */
/* ------------------------------------------------------------------ */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

const V4_BLOCKS: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata (169.254.169.254)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

const V4_BLOCK_RANGES = V4_BLOCKS.map(([base, bits]) => {
  const b = ipv4ToInt(base)!;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return { net: (b & mask) >>> 0, mask };
});

export function isBlockedIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable -> refuse
  return V4_BLOCK_RANGES.some(({ net, mask }) => ((n & mask) >>> 0) === net);
}

/** Expands an IPv6 string to 8 numeric hextets. Returns null if invalid. */
export function expandIPv6(input: string): number[] | null {
  let ip = input.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const zone = ip.indexOf("%");
  if (zone >= 0) ip = ip.slice(0, zone);
  if (!ip.includes(":")) return null;

  // Embedded dotted IPv4 tail (e.g. ::ffff:127.0.0.1)
  let tail: number[] = [];
  const lastColon = ip.lastIndexOf(":");
  const maybeV4 = ip.slice(lastColon + 1);
  if (maybeV4.includes(".")) {
    const n = ipv4ToInt(maybeV4);
    if (n === null) return null;
    tail = [(n >>> 16) & 0xffff, n & 0xffff];
    ip = ip.slice(0, lastColon + 1) + "0:0"; // placeholder, replaced below
  }

  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const parse = (s: string) => (s === "" ? [] : s.split(":"));
  const head = parse(halves[0] ?? "");
  const rest = halves.length === 2 ? parse(halves[1] ?? "") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 && head.length !== 8) return null;
  if (halves.length === 2 && missing < 1) return null;
  const all = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  if (all.length !== 8) return null;
  const nums = all.map((h) => (/^[0-9a-f]{1,4}$/.test(h) ? parseInt(h, 16) : NaN));
  if (nums.some((n) => Number.isNaN(n))) return null;
  if (tail.length) {
    nums[6] = tail[0]!;
    nums[7] = tail[1]!;
  }
  return nums;
}

export function isBlockedIPv6(ip: string): boolean {
  const h = expandIPv6(ip);
  if (!h) return true;
  const [a, b, c, d, e, f, g, i] = h as [number, number, number, number, number, number, number, number];

  // :: and ::1
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 && g === 0 && (i === 0 || i === 1)) return true;
  // IPv4-mapped ::ffff:a.b.c.d and IPv4-translated ::ffff:0:a.b.c.d -> judge the IPv4 part
  if (a === 0 && b === 0 && c === 0 && d === 0 && ((e === 0 && f === 0xffff) || (e === 0xffff && f === 0))) {
    return isBlockedIPv4(`${g >> 8}.${g & 0xff}.${i >> 8}.${i & 0xff}`);
  }
  // IPv4-compatible (deprecated) ::a.b.c.d
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0) return true;
  // NAT64 64:ff9b::/96 and local-use 64:ff9b:1::/48 -> refuse (can tunnel to private IPv4)
  if (a === 0x64 && b === 0xff9b) return true;
  // Discard-only 100::/64
  if (a === 0x100 && b === 0 && c === 0 && d === 0) return true;
  // Only global unicast 2000::/3 is acceptable from here on
  if ((a & 0xe000) !== 0x2000) return true;
  // Teredo 2001::/32, ORCHID/benchmark 2001:2::/48, 2001:10::/28, 2001:20::/28
  if (a === 0x2001 && (b === 0 || b === 2 || (b & 0xfff0) === 0x10 || (b & 0xfff0) === 0x20)) return true;
  // Documentation 2001:db8::/32 and 3fff::/20
  if (a === 0x2001 && b === 0x0db8) return true;
  if ((a & 0xfff0) === 0x3ff0) return true;
  // 6to4 2002::/16 -> embeds an IPv4 address; refuse
  if (a === 0x2002) return true;
  return false;
}

/** True when an IP address must never be contacted by the server. */
export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip.replace(/^\[|\]$/g, "").split("%")[0] ?? "");
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return true;
}
