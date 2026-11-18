// Readable-content extraction: Mozilla Readability on a linkedom DOM, with a
// structural fallback for pages Readability can't parse.

import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

export class ExtractError extends Error {
  constructor(
    public readonly code: "NO_CONTENT",
    message: string,
  ) {
    super(message);
    this.name = "ExtractError";
  }
}

export interface ExtractedPage {
  title: string;
  siteName: string;
  byline: string | null;
  publishedTime: string | null;
  lang: string | null;
  description: string | null;
  /** Plain text with paragraph breaks; headings prefixed with "## ". */
  text: string;
  wordCount: number;
  readingMinutes: number;
  truncated: boolean;
}

export const MAX_TEXT_CHARS = 16_000;
const WORDS_PER_MINUTE = 230;

const BLOCK_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,figcaption,td,th,dt,dd";
const NOISE_SELECTOR =
  "script,style,noscript,template,iframe,svg,canvas,form,button,input,select,textarea,nav,footer,aside,[aria-hidden='true'],[hidden],.cookie,.cookies,#cookie-banner,.advert,.ads,.ad,.newsletter,.share,.social";

function squash(s: string): string {
  return s.replace(/ /g, " ").replace(/[ \t\r\f\v]+/g, " ").replace(/ *\n */g, "\n").trim();
}

function meta(doc: Document, ...names: string[]): string | null {
  for (const n of names) {
    const el =
      doc.querySelector(`meta[property="${n}"]`) ||
      doc.querySelector(`meta[name="${n}"]`) ||
      doc.querySelector(`meta[itemprop="${n}"]`);
    const v = el?.getAttribute("content");
    if (v && v.trim()) return squash(v);
  }
  return null;
}

/** Walks block elements in document order and returns readable paragraphs. */
export function blocksToText(root: Element | Document): string {
  const out: string[] = [];
  const seen = new Set<string>();
  const blocks = Array.from(root.querySelectorAll(BLOCK_SELECTOR));
  for (const el of blocks) {
    // Skip blocks nested inside another block we will also visit (e.g. p inside li).
    const parentBlock = el.parentElement?.closest(BLOCK_SELECTOR);
    if (parentBlock && root.contains(parentBlock)) continue;
    const raw = squash(el.textContent || "");
    if (!raw) continue;
    const tag = el.tagName.toLowerCase();
    let line = raw;
    if (/^h[1-6]$/.test(tag)) line = `## ${raw}`;
    else if (tag === "li") line = `- ${raw}`;
    else if (tag === "blockquote") line = `> ${raw}`;
    if (raw.length < 3 && !/^h/.test(tag)) continue;
    if (seen.has(line)) continue; // repeated boilerplate
    seen.add(line);
    out.push(line);
  }
  return out.join("\n\n");
}

function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return m ? m.length : 0;
}

export function truncateText(text: string, max = MAX_TEXT_CHARS): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  const cut = text.slice(0, max);
  const lastBreak = cut.lastIndexOf("\n\n");
  return { text: (lastBreak > max * 0.7 ? cut.slice(0, lastBreak) : cut).trimEnd(), truncated: true };
}

function plainTextPage(raw: string, url: URL): ExtractedPage {
  const text = raw.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const words = countWords(text);
  if (words < 40) {
    throw new ExtractError("NO_CONTENT", "We couldn't find enough readable text on this page.");
  }
  const { text: finalText, truncated } = truncateText(text);
  const firstLine = text.split("\n").find((l) => l.trim())?.trim() ?? url.hostname;
  return {
    title: firstLine.slice(0, 120),
    siteName: url.hostname.replace(/^www\./, ""),
    byline: null,
    publishedTime: null,
    lang: null,
    description: null,
    text: finalText,
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    truncated,
  };
}

export function extractReadable(html: string, pageUrl: string, contentType = "text/html"): ExtractedPage {
  const url = new URL(pageUrl);
  // Plain-text documents (or bodies with no markup at all) skip the DOM.
  if (contentType.toLowerCase().startsWith("text/plain") || !/<[a-z!/][^>]*>/i.test(html.slice(0, 5000))) {
    return plainTextPage(html, url);
  }
  const { document } = parseHTML(html);
  const doc = document as unknown as Document;

  const lang = doc.documentElement?.getAttribute("lang")?.trim() || null;
  const metaTitle = meta(doc, "og:title", "twitter:title");
  const docTitle = squash(doc.querySelector("title")?.textContent || "");
  const siteName = meta(doc, "og:site_name", "application-name") || url.hostname.replace(/^www\./, "");
  const description = meta(doc, "description", "og:description", "twitter:description");
  const publishedTime = meta(doc, "article:published_time", "datePublished", "date", "pubdate");
  const metaAuthor = meta(doc, "author", "article:author");

  // Readability mutates the DOM, so give it its own copy.
  let readable: ReturnType<Readability["parse"]> = null;
  try {
    const { document: copy } = parseHTML(html);
    readable = new Readability(copy as unknown as Document, { charThreshold: 400, keepClasses: false }).parse();
  } catch {
    readable = null;
  }

  let text = "";
  if (readable?.content) {
    const { document: article } = parseHTML(`<!doctype html><html><body>${readable.content}</body></html>`);
    text = blocksToText(article as unknown as Document);
    if (text.length < 200 && readable.textContent) text = squash(readable.textContent);
  }

  if (text.length < 200) {
    // Fallback: strip obvious chrome and read the main region.
    doc.querySelectorAll(NOISE_SELECTOR).forEach((el) => el.remove());
    let body: Element | null = null;
    try {
      body = doc.body;
    } catch {
      body = null; // linkedom throws when there is no <html> element
    }
    const main =
      doc.querySelector("main") ||
      doc.querySelector("article") ||
      doc.querySelector("[role='main']") ||
      doc.querySelector("#content, .content, #main") ||
      body;
    if (main) {
      const fromBlocks = blocksToText(main);
      text = fromBlocks.length >= 200 ? fromBlocks : squash(main.textContent || "");
    }
  }

  const words = countWords(text);
  if (words < 40) {
    throw new ExtractError(
      "NO_CONTENT",
      "We couldn't find enough readable text on this page. It may need JavaScript, a login, or it may be mostly images.",
    );
  }

  const { text: finalText, truncated } = truncateText(text);
  const title = squash(readable?.title || metaTitle || docTitle || url.hostname).slice(0, 300);

  return {
    title,
    siteName: squash(readable?.siteName || siteName).slice(0, 120),
    byline: (readable?.byline || metaAuthor || null)?.slice(0, 160) ?? null,
    publishedTime: (readable?.publishedTime || publishedTime || null)?.slice(0, 40) ?? null,
    lang: (readable?.lang || lang)?.slice(0, 20) ?? null,
    description: description?.slice(0, 400) ?? null,
    text: finalText,
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    truncated,
  };
}
