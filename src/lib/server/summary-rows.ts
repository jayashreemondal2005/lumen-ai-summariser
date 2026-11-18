import type { SummaryResult } from "../schemas";

type Row = Record<string, unknown>;

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Maps a `summaries` table row to the API shape. */
export function rowToResult(r: Row): SummaryResult {
  const length = str(r.length, "standard");
  return {
    id: str(r.id),
    url: str(r.url),
    finalUrl: str(r.final_url, str(r.url)),
    siteName: str(r.site_name),
    title: str(r.title),
    tldr: str(r.tldr),
    summary: str(r.summary),
    keyPoints: arr(r.key_points),
    topics: arr(r.topics),
    contentType: str(r.content_type, "other") as SummaryResult["contentType"],
    quality: str(r.quality, "good") as SummaryResult["quality"],
    injectionDetected: Boolean(r.injection_detected),
    byline: typeof r.byline === "string" ? r.byline : null,
    publishedTime: typeof r.published_time === "string" ? r.published_time : null,
    lang: typeof r.lang === "string" ? r.lang : null,
    wordCount: Number(r.word_count) || 0,
    readingMinutes: Number(r.reading_minutes) || 1,
    truncated: Boolean(r.truncated),
    length: (["brief", "standard", "detailed"].includes(length) ? length : "standard") as SummaryResult["length"],
    model: str(r.model),
    createdAt: str(r.created_at),
    saved: true,
  };
}
