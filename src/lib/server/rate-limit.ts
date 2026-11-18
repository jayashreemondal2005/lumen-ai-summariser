import "server-only";
import { supabaseAdmin } from "./supabase";

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

// Fallback store for local development or if the database is unreachable.
// On serverless hosts it is per-instance, which is why the Postgres-backed
// limiter is preferred whenever Supabase is configured.
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryHit(key: string, windowSec: number, max: number): RateResult {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (memory.size > 5000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return { allowed: true, remaining: max - 1, retryAfterSec: 0 };
  }
  entry.count += 1;
  const allowed = entry.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - entry.count),
    retryAfterSec: allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000),
  };
}

/** Fixed-window limiter. `key` should already be hashed (no raw IPs/emails). */
export async function rateLimit(key: string, windowSec: number, max: number): Promise<RateResult> {
  const db = supabaseAdmin();
  if (db) {
    const { data, error } = await db.rpc("rate_limit_hit", {
      p_key: key,
      p_window_seconds: windowSec,
      p_max: max,
    });
    if (!error && data && typeof data === "object") {
      const d = data as { allowed: boolean; remaining: number; retry_after: number };
      return { allowed: d.allowed, remaining: d.remaining, retryAfterSec: d.retry_after };
    }
  }
  return memoryHit(key, windowSec, max);
}

/** Applies several limits; the first one that fails wins. */
export async function rateLimitAll(
  rules: Array<{ key: string; windowSec: number; max: number }>,
): Promise<RateResult> {
  let last: RateResult = { allowed: true, remaining: Infinity, retryAfterSec: 0 };
  for (const r of rules) {
    const res = await rateLimit(r.key, r.windowSec, r.max);
    if (!res.allowed) return res;
    last = res.remaining < last.remaining ? res : last;
  }
  return last;
}
