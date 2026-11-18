import { LIMITS } from "@/lib/config";
import { AskRequestSchema } from "@/lib/schemas";
import { normaliseUserUrl, UrlGuardError } from "@/lib/server/url-guard";
import { FetchPageError } from "@/lib/server/safe-fetch";
import { ExtractError } from "@/lib/server/extract";
import { loadPage } from "@/lib/server/page-cache";
import { askPage } from "@/lib/server/summarise";
import { AiNotConfiguredError, AiUnavailableError } from "@/lib/server/ai";
import { rateLimit } from "@/lib/server/rate-limit";
import { apiError, clientIp, hashIp, json, readJson, sameOrigin } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Answers a question using only the text of one page. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  let body: unknown;
  try {
    body = await readJson(req, 12_000);
  } catch {
    return apiError(400, "BAD_REQUEST", "The request could not be read.");
  }
  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "BAD_REQUEST", parsed.error.issues[0]?.message || "Invalid question.");

  let url: string;
  try {
    url = normaliseUserUrl(parsed.data.url);
  } catch (err) {
    return apiError(400, (err as UrlGuardError).code || "INVALID_URL", (err as Error).message);
  }

  const limit = await rateLimit(`ask:m:${hashIp(clientIp(req))}`, 60, LIMITS.askPerMinute);
  if (!limit.allowed) return apiError(429, "RATE_LIMITED", "You're asking quickly. Please wait a moment.", { retryAfter: limit.retryAfterSec });

  try {
    const { page, finalUrl } = await loadPage(url);
    const { answer, model } = await askPage(page, finalUrl, parsed.data.question, parsed.data.language, parsed.data.history);
    return json({ ...answer, model });
  } catch (err) {
    if (err instanceof FetchPageError || err instanceof ExtractError) return apiError(422, err.code, err.message);
    if (err instanceof AiNotConfiguredError) return apiError(503, "AI_NOT_CONFIGURED", "Answers are temporarily unavailable.");
    if (err instanceof AiUnavailableError) return apiError(503, "AI_BUSY", err.message);
    console.error("[ask] unexpected", (err as Error)?.name);
    return apiError(500, "INTERNAL", "Something went wrong. Please try again.");
  }
}
