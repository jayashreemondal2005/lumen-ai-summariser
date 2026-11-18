import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "./env";

/** Best-effort client IP. Netlify sets x-nf-client-connection-ip. */
export function clientIp(req: Request): string {
  const h = req.headers;
  const ip =
    h.get("x-nf-client-connection-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0] ||
    "0.0.0.0";
  return ip.trim().slice(0, 64);
}

/** We never store raw IPs: only a salted hash, used for abuse limits. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${serverEnv().IP_HASH_SALT}:${ip}`).digest("hex").slice(0, 32);
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

export function apiError(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return json({ error: { code, message, ...extra } }, { status });
}

/** Rejects cross-site POSTs (CSRF defence in depth on top of SameSite cookies). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from some browsers omit Origin on GET; POST always has it
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    return Boolean(host) && o.host === host;
  } catch {
    return false;
  }
}

export async function readJson(req: Request, maxBytes = 32_000): Promise<unknown> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > maxBytes) throw new Error("Request body too large");
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("Request body too large");
  return text ? JSON.parse(text) : {};
}
