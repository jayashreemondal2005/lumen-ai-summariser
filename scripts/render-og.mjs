// Renders the /og-card page to public/og.png (1200x630).
// Usage: start the app (npm run dev), then: node scripts/render-og.mjs [baseUrl]
import { chromium } from "@playwright/test";
import path from "node:path";

const base = process.argv[2] || "http://localhost:3000";
const out = path.resolve(import.meta.dirname, "..", "public", "og.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light" });
await page.goto(`${base}/og-card`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: "header, footer, [aria-label^='Ask Tara'], nextjs-portal { display: none !important; }" });
await page.locator("[data-og-card] > div").screenshot({ path: out });
await browser.close();
console.log("Wrote", out);
