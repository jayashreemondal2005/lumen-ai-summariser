import { randomUUID } from "node:crypto";
import { LIMITS } from "@/lib/config";
import { SummariseRequestSchema, type SummariseEvent, type SummaryResult } from "@/lib/schemas";
import { normaliseUserUrl, UrlGuardError } from "@/lib/server/url-guard";
import { FetchPageError, safeFetchPage } from "@/lib/server/safe-fetch";
import { ExtractError, extractReadable } from "@/lib/server/extract";
import { summarisePage } from "@/lib/server/summarise";
import { AiNotConfiguredError, AiUnavailableError, aiConfigured } from "@/lib/server/ai";
import { rateLimitAll } from "@/lib/server/rate-limit";
import { apiError, clientIp, hashIp, readJson, sameOrigin } from "@/lib/server/request";
import { currentUser } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RETRYABLE = new Set(["TIMEOUT", "NETWORK", "HTTP_ERROR", "AI_BUSY", "INTERNAL"]);

function toEvent(err: unknown): Extract<SummariseEvent, { type: "error" }> {
  if (err instanceof FetchPageError) {
    const retryable = RETRYABLE.has(err.code) && !(err.status && err.status >= 400 && err.status < 500 && err.status !== 429);
    return { type: "error", code: err.code, message: err.message, retryable };
  }
  if (err instanceof ExtractError) return { type: "error", code: err.code, message: err.message, retryable: false };
  if (err instanceof AiNotConfiguredError)
    return { type: "error", code: "AI_NOT_CONFIGURED", message: "Summaries are temporarily unavailable.", retryable: false };
  if (err instanceof AiUnavailableError) return { type: "error", code: "AI_BUSY", message: err.message, retryable: true };
  console.error("[summarise] unexpected", (err as Error)?.name, (err as Error)?.message?.slice(0, 200));
  return { type: "error", code: "INTERNAL", message: "Something went wrong on our side. Please try again.", retryable: true };
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");

  let body: unknown;
  try {
    body = await readJson(req, 4_000);
  } catch {
    return apiError(400, "BAD_REQUEST", "The request could not be read.");
  }
  const parsed = SummariseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "INVALID_URL", parsed.error.issues[0]?.message || "Enter a valid web address.");
  }

  let url: string;
  try {
    url = normaliseUserUrl(parsed.data.url);
  } catch (err) {
    const e = err as UrlGuardError;
    return apiError(400, e.code || "INVALID_URL", e.message);
  }

  const session = await currentUser();
  const who = session ? `u:${session.user.id}` : `ip:${hashIp(clientIp(req))}`;
  const limit = await rateLimitAll([
    { key: `sum:m:${who}`, windowSec: 60, max: LIMITS.summarisePerMinute },
    { key: `sum:d:${who}`, windowSec: 86_400, max: LIMITS.summarisePerDay },
  ]);
  if (!limit.allowed) {
    return apiError(429, "RATE_LIMITED", `You've reached the summary limit. Try again in ${Math.max(1, Math.ceil(limit.retryAfterSec / 60))} minute(s).`, {
      retryAfter: limit.retryAfterSec,
    });
  }
  if (!aiConfigured()) return apiError(503, "AI_NOT_CONFIGURED", "Summaries are temporarily unavailable.");

  const { length } = parsed.data;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: SummariseEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        send({ type: "stage", stage: "fetching" });
        const page = await safeFetchPage(url, { timeoutMs: 9000 });

        send({ type: "stage", stage: "extracting" });
        const extracted = extractReadable(page.html, page.finalUrl, page.contentType);

        send({ type: "stage", stage: "summarising" });
        const { content, model } = await summarisePage(extracted, page.finalUrl, length);

        let id: string = randomUUID();
        let createdAt = new Date().toISOString();
        let saved = false;
        if (session) {
          send({ type: "stage", stage: "saving" });
          const { data, error } = await session.client
            .from("summaries")
            .insert({
              user_id: session.user.id,
              url,
              final_url: page.finalUrl,
              site_name: extracted.siteName,
              title: content.title,
              tldr: content.tldr,
              summary: content.summary,
              key_points: content.keyPoints,
              topics: content.topics,
              content_type: content.contentType,
              quality: content.quality,
              injection_detected: content.injectionDetected,
              length,
              word_count: extracted.wordCount,
              reading_minutes: extracted.readingMinutes,
              byline: extracted.byline,
              published_time: extracted.publishedTime,
              lang: extracted.lang,
              truncated: extracted.truncated,
              model,
            })
            .select("id, created_at")
            .single();
          if (!error && data) {
            id = data.id as string;
            createdAt = data.created_at as string;
            saved = true;
          } else if (error) {
            console.warn("[summarise] save failed", error.code);
          }
        }

        const result: SummaryResult = {
          ...content,
          id,
          url,
          finalUrl: page.finalUrl,
          siteName: extracted.siteName,
          byline: extracted.byline,
          publishedTime: extracted.publishedTime,
          lang: extracted.lang,
          wordCount: extracted.wordCount,
          readingMinutes: extracted.readingMinutes,
          truncated: extracted.truncated,
          length,
          model,
          createdAt,
          saved,
        };
        send({ type: "result", data: result });
      } catch (err) {
        send(toEvent(err));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-RateLimit-Remaining": String(limit.remaining),
    },
  });
}
