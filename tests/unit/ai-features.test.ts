import { describe, expect, it } from "vitest";
import { ASK_INSTRUCTIONS, REWRITE_INSTRUCTIONS, buildSummaryPrompt, normaliseForMatch, verifyQuotes } from "@/lib/server/summarise";
import { AskRequestSchema, RewriteRequestSchema, SummariseRequestSchema } from "@/lib/schemas";
import { LANGUAGES, isRtl, languageName } from "@/lib/config";
import type { ExtractedPage } from "@/lib/server/extract";

const page: ExtractedPage = {
  title: "Howrah Bridge",
  siteName: "Wikipedia",
  byline: null,
  publishedTime: null,
  lang: "en",
  description: null,
  text: "## History\n\nThe Howrah Bridge is a cantilever bridge over the Hooghly River in West Bengal.\n\n- It opened in 1943.\n\nIt carries about 100,000 vehicles every day.",
  wordCount: 30,
  readingMinutes: 1,
  truncated: false,
};

describe("Ask about this page: quote verification (anti-hallucination)", () => {
  it("keeps quotes that appear in the page, ignoring case, spacing and curly quotes", () => {
    const q = verifyQuotes(["a cantilever bridge over the  Hooghly River", "“It opened in 1943.”", "IT CARRIES ABOUT 100,000 VEHICLES"], page.text);
    expect(q).toEqual(["a cantilever bridge over the  Hooghly River", "It opened in 1943.", "IT CARRIES ABOUT 100,000 VEHICLES"]);
  });

  it("drops invented or paraphrased quotes", () => {
    expect(verifyQuotes(["The bridge was designed by Gustave Eiffel.", "opened in the year 1943"], page.text)).toEqual([]);
  });

  it("drops very short fragments, duplicates and keeps at most three", () => {
    const q = verifyQuotes(["the", "It opened in 1943.", "It opened in 1943.", "Howrah Bridge is", "over the Hooghly", "West Bengal"], page.text);
    expect(q.length).toBeLessThanOrEqual(3);
    expect(q).not.toContain("the");
    expect(new Set(q).size).toBe(q.length);
  });

  it("normalises typographic punctuation", () => {
    expect(normaliseForMatch("It’s  “quoted” – here")).toBe("it's \"quoted\" - here");
  });
});

describe("Summary prompt: language and style", () => {
  it("includes the output language and style rules", () => {
    const p = buildSummaryPrompt(page, "https://en.wikipedia.org/wiki/Howrah_Bridge", "brief", "bn", "simple");
    expect(p).toContain("Output language: Bengali");
    expect(p).toContain("Style: Simple");
    expect(p).toContain("keyPoints: exactly 3");
  });

  it("defaults to English and the balanced style", () => {
    const p = buildSummaryPrompt(page, "https://example.com", "standard");
    expect(p).toContain("Output language: English");
    expect(p).toContain("Style: Balanced");
  });

  it("every instruction set treats user and page content as data", () => {
    for (const ins of [ASK_INSTRUCTIONS, REWRITE_INSTRUCTIONS]) {
      expect(ins).toMatch(/untrusted DATA/);
    }
    expect(ASK_INSTRUCTIONS).toMatch(/answerable to false/);
    expect(ASK_INSTRUCTIONS).toMatch(/<earlier_questions>/);
  });
});

describe("Request validation for the new endpoints", () => {
  it("summarise accepts language, style and save, and rejects unknown values", () => {
    const ok = SummariseRequestSchema.parse({ url: "example.com", language: "hi", style: "executive", save: false });
    expect(ok).toMatchObject({ language: "hi", style: "executive", save: false, length: "standard" });
    expect(SummariseRequestSchema.safeParse({ url: "example.com", language: "xx" }).success).toBe(false);
    expect(SummariseRequestSchema.safeParse({ url: "example.com", style: "funny" }).success).toBe(false);
  });

  it("ask requires a real question and limits history", () => {
    expect(AskRequestSchema.safeParse({ url: "example.com", question: "?" }).success).toBe(false);
    expect(AskRequestSchema.safeParse({ url: "example.com", question: "x".repeat(401) }).success).toBe(false);
    expect(
      AskRequestSchema.safeParse({ url: "example.com", question: "Why?", history: Array.from({ length: 5 }, () => ({ q: "a", a: "b" })) }).success,
    ).toBe(false);
    expect(AskRequestSchema.parse({ url: "example.com", question: "What year?" }).language).toBe("en");
  });

  it("rewrite caps the size of the summary it accepts", () => {
    const content = { title: "t", tldr: "t", summary: "s", keyPoints: ["k"], topics: [] };
    expect(RewriteRequestSchema.safeParse({ mode: "simpler", content }).success).toBe(true);
    expect(RewriteRequestSchema.safeParse({ mode: "simpler", content: { ...content, summary: "x".repeat(4001) } }).success).toBe(false);
    expect(RewriteRequestSchema.safeParse({ mode: "poem", content }).success).toBe(false);
  });
});

describe("Language helpers", () => {
  it("knows 16 languages, their names and direction", () => {
    expect(LANGUAGES).toHaveLength(16);
    expect(languageName("ta")).toBe("Tamil");
    expect(languageName("zz")).toBe("English");
    expect(isRtl("ur")).toBe(true);
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("hi")).toBe(false);
  });
});
