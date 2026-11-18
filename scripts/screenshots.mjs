// Visual QA screenshots (mocks the summarise API so no AI calls are made).
// Usage: node scripts/screenshots.mjs <baseUrl> <outDir> [names...]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || ".";
const only = process.argv.slice(4);
mkdirSync(out, { recursive: true });

const RESULT = {
  type: "result",
  data: {
    title: "How to Do Great Work",
    tldr: "Great work comes from choosing a field you're naturally good at and deeply interested in, then working hard to reach the frontier, notice gaps, and pursue them.",
    summary:
      "Paul Graham outlines a practical recipe for great work: first pick a project that matches your natural aptitude and intense curiosity, then learn enough to reach the frontier of knowledge, spot the gaps, and explore them.\n\nSuccess relies on sustained, hard work driven by genuine interest, boldness, and consistency rather than detailed planning.",
    keyPoints: [
      "Choose work that aligns with your natural talent and deep curiosity.",
      "Learn to the frontier, notice gaps, and pursue them with hard, consistent effort.",
      "Let curiosity, delight, and ambition guide you, staying flexible rather than over-planning.",
    ],
    topics: ["productivity", "career", "ambition"],
    contentType: "article",
    quality: "good",
    injectionDetected: false,
    id: "demo",
    url: "https://paulgraham.com/greatwork.html",
    finalUrl: "https://paulgraham.com/greatwork.html",
    siteName: "paulgraham.com",
    byline: null,
    publishedTime: null,
    lang: null,
    wordCount: 11801,
    readingMinutes: 51,
    truncated: true,
    length: "brief",
    model: "groq:openai/gpt-oss-120b",
    createdAt: new Date().toISOString(),
    saved: false,
  },
};

const shots = [
  { name: "home-desktop-light", path: "/", vp: [1280, 860], scheme: "light" },
  { name: "home-desktop-dark", path: "/", vp: [1280, 860], scheme: "dark" },
  { name: "home-mobile-light", path: "/", vp: [390, 844], scheme: "light", mobile: true },
  { name: "result-desktop-light", path: "/", vp: [1280, 1500], scheme: "light", result: true },
  { name: "result-desktop-dark", path: "/", vp: [1280, 1500], scheme: "dark", result: true },
  { name: "result-mobile-dark", path: "/", vp: [390, 1700], scheme: "dark", mobile: true, result: true },
  { name: "loading-desktop", path: "/", vp: [1280, 900], scheme: "light", loading: true },
  { name: "error-desktop", path: "/", vp: [1280, 900], scheme: "light", error: true },
  { name: "terms-gate", path: "/", vp: [1280, 860], scheme: "light", terms: true },
  { name: "tara-open", path: "/help", vp: [1280, 860], scheme: "light", tara: true },
  { name: "help-desktop", path: "/help", vp: [1280, 1200], scheme: "light" },
  { name: "support-desktop", path: "/support", vp: [1280, 1100], scheme: "light" },
  { name: "legal-terms", path: "/legal/terms", vp: [1280, 1000], scheme: "light" },
  { name: "history-empty", path: "/history", vp: [1280, 800], scheme: "dark" },
  { name: "notfound", path: "/nope", vp: [1280, 800], scheme: "light" },
  { name: "signin", path: "/sign-in", vp: [1280, 800], scheme: "light" },
];

const browser = await chromium.launch();
for (const s of shots) {
  if (only.length && !only.includes(s.name)) continue;
  const ctx = await browser.newContext({
    viewport: { width: s.vp[0], height: s.vp[1] },
    deviceScaleFactor: s.mobile ? 2 : 1,
    colorScheme: s.scheme,
    isMobile: Boolean(s.mobile),
    hasTouch: Boolean(s.mobile),
  });
  const page = await ctx.newPage();
  if (!s.terms) {
    await page.addInitScript(() => {
      localStorage.setItem("lumen.consent.v1", JSON.stringify({ state: { anonId: "11111111-1111-4111-8111-111111111111", termsVersion: "1.0.0", acceptedAt: new Date().toISOString() }, version: 0 }));
      localStorage.setItem("lumen.consent.synced.11111111-1111-4111-8111-111111111111:1.0.0", "1");
    });
  }
  if (s.result || s.loading || s.error) {
    await page.route("**/api/summarise", async (route) => {
      const lines = [{ type: "stage", stage: "fetching" }, { type: "stage", stage: "extracting" }];
      if (s.loading) {
        lines.push({ type: "stage", stage: "summarising" });
        await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: lines.map((l) => JSON.stringify(l)).join("\n") + "\n" });
        return;
      }
      if (s.error) {
        await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: [JSON.stringify(lines[0]), JSON.stringify({ type: "error", code: "HTTP_ERROR", message: "The website blocked automated access to this page.", retryable: false })].join("\n") + "\n" });
        return;
      }
      lines.push({ type: "stage", stage: "summarising" }, RESULT);
      await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: lines.map((l) => JSON.stringify(l)).join("\n") + "\n" });
    });
  }
  await page.goto(base + s.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} body>header,header.sticky{position:static!important}" });
  if (s.result || s.loading || s.error || s.terms) {
    await page.getByLabel("Web page address").fill(s.result ? "paulgraham.com/greatwork.html" : "https://example.com/article");
    await page.getByRole("button", { name: /Summarise/ }).click();
    if (s.loading) {
      // keep the stream open state: our fake stream ends without result -> shows error; capture quickly
      await page.waitForTimeout(60);
    } else await page.waitForTimeout(700);
  }
  if (s.tara) {
    await page.getByRole("button", { name: /Ask Tara, the Lumen/ }).click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${out}/${s.name}.png`, fullPage: !s.terms && !s.tara && !s.loading });
  console.log("shot", s.name);
  await ctx.close();
}
await browser.close();
