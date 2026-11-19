import { LIMITS } from "@/lib/config";
import { TaraRequestSchema } from "@/lib/schemas";
import { askTara } from "@/lib/server/tara";
import { rateLimitAll } from "@/lib/server/rate-limit";
import { apiError, clientIp, hashIp, json, readJson, sameOrigin } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  let body: unknown;
  try {
    body = await readJson(req, 24_000);
  } catch {
    return apiError(400, "BAD_REQUEST", "The request could not be read.");
  }
  const parsed = TaraRequestSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "BAD_REQUEST", "Please type a shorter question (up to 600 characters).");

  const who = hashIp(clientIp(req));
  const limit = await rateLimitAll([
    { key: `tara:m:${who}`, windowSec: 60, max: LIMITS.taraPerMinute },
    { key: `tara:d:${who}`, windowSec: 86_400, max: LIMITS.taraPerDay },
  ]);
  if (!limit.allowed) {
    return apiError(429, "RATE_LIMITED", "You're sending messages quickly. Please wait a moment and try again.", {
      retryAfter: limit.retryAfterSec,
    });
  }

  const reply = await askTara(parsed.data.message, parsed.data.history);
  return json(reply);
}
