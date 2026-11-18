import "server-only";
import { safeFetchPage } from "./safe-fetch";
import { extractReadable, type ExtractedPage } from "./extract";

// Small per-instance cache so follow-up questions about the same page don't
// refetch it every time. Entries expire after 10 minutes.
const TTL_MS = 10 * 60 * 1000;
const MAX = 40;
const cache = new Map<string, { at: number; finalUrl: string; page: ExtractedPage }>();

export function rememberPage(url: string, finalUrl: string, page: ExtractedPage) {
  cache.delete(url);
  cache.set(url, { at: Date.now(), finalUrl, page });
  if (finalUrl !== url) cache.set(finalUrl, { at: Date.now(), finalUrl, page });
  while (cache.size > MAX) cache.delete(cache.keys().next().value as string);
}

export async function loadPage(url: string): Promise<{ finalUrl: string; page: ExtractedPage; cached: boolean }> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return { finalUrl: hit.finalUrl, page: hit.page, cached: true };
  const fetched = await safeFetchPage(url, { timeoutMs: 9000 });
  const page = extractReadable(fetched.html, fetched.finalUrl, fetched.contentType);
  rememberPage(url, fetched.finalUrl, page);
  return { finalUrl: fetched.finalUrl, page, cached: false };
}
