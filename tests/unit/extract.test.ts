import { describe, expect, it } from "vitest";
import { ExtractError, MAX_TEXT_CHARS, blocksToText, extractReadable, truncateText } from "@/lib/server/extract";
import { parseHTML } from "linkedom";

const para = (n: number, word = "lumen") => Array.from({ length: n }, (_, i) => `${word}${i}`).join(" ");

const ARTICLE = `<!doctype html>
<html lang="en">
<head>
  <title>Kolkata trams | City Paper</title>
  <meta property="og:site_name" content="City Paper">
  <meta property="og:title" content="The last trams of Kolkata">
  <meta name="description" content="A look at the oldest tram network in Asia.">
  <meta name="author" content="R. Sen">
  <meta property="article:published_time" content="2026-10-01T08:00:00Z">
</head>
<body>
  <nav><a href="/">Home</a> <a href="/news">News</a> <a href="/sport">Sport</a></nav>
  <div class="cookie">We use cookies. Accept?</div>
  <main>
    <article>
      <h1>The last trams of Kolkata</h1>
      <p>Kolkata's trams first ran in 1873, pulled by horses, and the network became the oldest operating electric tram system in Asia. ${para(30, "history")}</p>
      <h2>Why they matter</h2>
      <p>Supporters say trams are clean, cheap and part of the city's identity. ${para(40, "support")}</p>
      <ul><li>Fares are among the lowest in the city.</li><li>Trams produce no tailpipe emissions.</li></ul>
      <p>Critics point to slow speeds and traffic congestion on narrow roads. ${para(40, "critic")}</p>
      <script>alert("tracking")</script>
    </article>
  </main>
  <footer>© City Paper. All rights reserved. Privacy · Terms</footer>
</body>
</html>`;

describe("extractReadable", () => {
  const page = extractReadable(ARTICLE, "https://www.citypaper.example/trams");

  it("reads metadata", () => {
    expect(page.title).toMatch(/trams of Kolkata/);
    expect(page.siteName).toBe("City Paper");
    expect(page.byline).toMatch(/Sen/);
    expect(page.publishedTime).toContain("2026-10-01");
    expect(page.lang).toBe("en");
    expect(page.description).toMatch(/oldest tram network/);
  });

  it("keeps the article and drops navigation, scripts and footer", () => {
    expect(page.text).toContain("first ran in 1873");
    expect(page.text).toContain("## Why they matter");
    expect(page.text).toContain("- Fares are among the lowest");
    expect(page.text).not.toContain("alert(");
    expect(page.text).not.toContain("All rights reserved");
  });

  it("counts words and reading time", () => {
    expect(page.wordCount).toBeGreaterThan(120);
    expect(page.readingMinutes).toBeGreaterThanOrEqual(1);
    expect(page.truncated).toBe(false);
  });

  it("falls back to the main region when Readability finds no article", () => {
    const html = `<html><body><div id="content">${Array.from({ length: 6 }, (_, i) => `<div>Section ${i}: ${para(15)}</div>`).join("")}</div></body></html>`;
    const p = extractReadable(html, "https://example.com/");
    expect(p.wordCount).toBeGreaterThan(40);
    expect(p.siteName).toBe("example.com");
  });

  it("throws NO_CONTENT for pages without readable text", () => {
    const html = `<html><head><title>App</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>`;
    expect(() => extractReadable(html, "https://spa.example/")).toThrow(ExtractError);
  });

  it("handles plain text documents", () => {
    const p = extractReadable(para(80, "plain"), "https://example.com/notes.txt");
    expect(p.wordCount).toBe(80);
  });

  it("truncates very long pages on a paragraph boundary", () => {
    const long = `<html><body><article>${Array.from({ length: 400 }, (_, i) => `<p>Paragraph ${i}. ${para(20)}</p>`).join("")}</article></body></html>`;
    const p = extractReadable(long, "https://example.com/long");
    expect(p.truncated).toBe(true);
    expect(p.text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
    expect(p.text.endsWith(".")).toBe(false); // ends at a paragraph, not mid-word
  });
});

describe("helpers", () => {
  it("blocksToText skips nested duplicates and repeated boilerplate", () => {
    const { document } = parseHTML("<body><ul><li><p>Point one is here</p></li></ul><p>Repeat me</p><p>Repeat me</p></body>");
    const text = blocksToText(document as unknown as Document);
    expect(text.match(/Point one/g)?.length).toBe(1);
    expect(text.match(/Repeat me/g)?.length).toBe(1);
  });

  it("truncateText leaves short text alone", () => {
    expect(truncateText("short", 100)).toEqual({ text: "short", truncated: false });
  });
});
