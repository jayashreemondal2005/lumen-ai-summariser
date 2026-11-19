import { LIMITS } from "@/lib/config";
import { RewriteRequestSchema } from "@/lib/schemas";
import { rewriteSummary } from "@/lib/server/summarise";
import { AiNotConfiguredError, AiUnavailableError } from "@/lib/server/ai";
import { rateLimitAll } from "@/lib/server/rate-limit";
import { apiError, clientIp, hashIp, json, readJson, sameOrigin } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Rewrites an existing summary: simpler, shorter, or in another language. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  let body: unknown;
  try {
    body = await readJson(req, 16_000);
  } catch {
    return apiError(400, "BAD_REQUEST", "The request could not be read.");
  }
  const parsed = RewriteRequestSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "BAD_REQUEST", "Invalid summary.");

  const who = hashIp(clientIp(req));
  const limit = await rateLimitAll([
    { key: `rewrite:m:${who}`, windowSec: 60, max: LIMITS.rewritePerMinute },
    { key: `rewrite:d:${who}`, windowSec: 86_400, max: LIMITS.rewritePerDay },
  ]);
  if (!limit.allowed) return apiError(429, "RATE_LIMITED", "Please wait a moment before rewriting again.", { retryAfter: limit.retryAfterSec });

  try {
    const { content, model } = await rewriteSummary(parsed.data.content, parsed.data.mode, parsed.data.language);
    return json({ content, model });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return apiError(503, "AI_NOT_CONFIGURED", "Rewriting is temporarily unavailable.");
    if (err instanceof AiUnavailableError) return apiError(503, "AI_BUSY", err.message);
    console.error("[rewrite] unexpected", (err as Error)?.name);
    return apiError(500, "INTERNAL", "Something went wrong. Please try again.");
  }
}
