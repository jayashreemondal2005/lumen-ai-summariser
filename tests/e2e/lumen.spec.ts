import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Accepts the Terms of Service gate the way a person would: scroll to the end, tick, agree. */
async function acceptTerms(page: Page) {
  const dialog = page.getByRole("dialog", { name: /Terms of Service/ });
  await expect(dialog).toBeVisible();
  const agree = dialog.getByRole("button", { name: "I agree and continue" });
  await expect(agree).toBeDisabled();
  await expect(dialog.getByRole("checkbox")).toBeDisabled();
  await dialog.getByRole("document").evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await dialog.getByRole("checkbox").check();
  await expect(agree).toBeEnabled();
  await agree.click();
  await expect(dialog).toBeHidden();
}

async function summarise(page: Page, url: string) {
  await page.getByLabel("Web page address").fill(url);
  await page.getByRole("button", { name: /Summarise/ }).click();
}

test.describe("Home and summariser", () => {
  test("renders the hero, input and length options", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Clarity for every page." })).toBeVisible();
    await expect(page.getByLabel("Web page address")).toBeVisible();
    const lengths = page.getByRole("radiogroup", { name: "Summary length" });
    await expect(lengths.getByRole("radio", { name: "Standard" })).toHaveAttribute("aria-checked", "true");
    await lengths.getByRole("radio", { name: "Brief" }).click();
    await expect(lengths.getByRole("radio", { name: "Brief" })).toHaveAttribute("aria-checked", "true");
  });

  test("validates input on the client before any request", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Summarise/ }).click();
    await expect(page.getByRole("alert")).toHaveText("Enter a web address.");
    await summarise(page, "not a url");
    await expect(page.getByRole("alert")).toContainText("spaces");
  });

  test("Terms gate requires scrolling to the end before accepting", async ({ page }) => {
    await page.goto("/");
    await summarise(page, "example.com");
    await acceptTerms(page);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("lumen.consent.v1") || "{}"));
    expect(stored.state.termsVersion).toBe("1.0.0");
  });

  test("blocks SSRF targets with a clear message", async ({ page }) => {
    await page.goto("/");
    await summarise(page, "http://169.254.169.254/latest/meta-data/");
    await acceptTerms(page);
    await expect(page.getByRole("heading", { name: "This address can't be opened" })).toBeVisible();
    await summarise(page, "http://localhost:3000/api/health");
    await expect(page.getByRole("heading", { name: "This address can't be opened" })).toBeVisible();
  });

  test("summarises a real page end to end and saves it to guest history", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/");
    await page.getByRole("radio", { name: "Brief" }).click();
    await summarise(page, "https://en.wikipedia.org/wiki/Howrah_Bridge");
    await acceptTerms(page);
    await expect(page.getByText("Fetching the page")).toBeVisible();
    const article = page.getByRole("article");
    await expect(article).toBeVisible({ timeout: 60_000 });
    await expect(article.getByRole("heading", { level: 2 })).toContainText(/Howrah/i);
    await expect(article.getByText("TL;DR")).toBeVisible();
    expect(await article.locator("ol li").count()).toBeGreaterThanOrEqual(2);
    await expect(article.getByText("Saved in this browser")).toBeVisible();

    await page.goto("/history");
    await expect(page.getByRole("button", { name: /Howrah/i })).toBeVisible();
    await page.getByRole("button", { name: /Howrah/i }).click();
    await expect(page.getByRole("article")).toBeVisible();
  });
});

test.describe("Ask Tara and support", () => {
  test("Tara answers from the Help Center and offers a person", async ({ page }) => {
    await page.goto("/help");
    await page.getByRole("button", { name: /Ask Tara/ }).first().click();
    const tara = page.getByRole("dialog", { name: "Ask Tara" });
    await expect(tara).toBeVisible();
    await tara.getByLabel("Ask Tara a question").fill("How do I reset my password?");
    await tara.getByRole("button", { name: "Send" }).click();
    await expect(tara.getByRole("link", { name: /Reset your password/ })).toBeVisible({ timeout: 30_000 });

    await tara.getByLabel("Ask Tara a question").fill("Talk to a person");
    await tara.getByRole("button", { name: "Send" }).click();
    await expect(tara.getByRole("button", { name: "Raise a support ticket" }).last()).toBeVisible({ timeout: 30_000 });
  });

  test("ticket form validates and shows the ticket ID (email sending mocked)", async ({ page }) => {
    await page.route("**/api/tickets", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, ticketRef: "LUM-261118-TEST", emailed: true }) }),
    );
    await page.goto("/support");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Please enter your name.")).toBeVisible();
    await page.getByLabel("Your name").fill("Test User");
    await page.getByLabel("Email").fill("test.user@example.com");
    await page.getByLabel("Subject").fill("Summary missed a point");
    await page.getByLabel("How can we help?").fill("The summary for my page left out the most important argument.");
    await page.waitForTimeout(2600); // the form rejects bot-fast submissions
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("LUM-261118-TEST")).toBeVisible();
    await expect(page.getByText(/emailed a confirmation/)).toBeVisible();
  });

  test("Help Center search finds articles", async ({ page }) => {
    await page.goto("/help");
    await page.getByLabel("Search the Help Center").fill("pdf");
    await page.getByRole("link", { name: /PDFs, videos or images/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("PDFs");
  });
});

test.describe("Legal, security and accessibility", () => {
  test("legal pages show version and operator", async ({ page }) => {
    for (const slug of ["terms", "privacy", "cookies", "ai-disclaimer", "acceptable-use"]) {
      await page.goto(`/legal/${slug}`);
      await expect(page.getByText(/Version 1\.0\.0 · Effective 18 November 2026 · Operated by Jayashree Mondal/)).toBeVisible();
    }
    await page.goto("/legal/privacy");
    await expect(page.getByText(/Digital Personal Data Protection Act, 2023/).first()).toBeVisible();
  });

  test("security headers are set on pages and APIs", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
    const api = await request.get("/api/health");
    expect(api.headers()["cache-control"]).toContain("no-store");
  });

  test("API rejects cross-site and malformed requests", async ({ request }) => {
    const cross = await request.post("/api/summarise", {
      headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
      data: { url: "example.com" },
    });
    expect(cross.status()).toBe(403);
    const bad = await request.post("/api/summarise", { headers: { "Content-Type": "application/json" }, data: { url: "", length: "huge" } });
    expect(bad.status()).toBe(400);
    const ssrf = await request.post("/api/summarise", { headers: { "Content-Type": "application/json" }, data: { url: "http://[::ffff:127.0.0.1]/" } });
    expect(ssrf.status()).toBe(400);
    expect((await ssrf.json()).error.code).toBe("BLOCKED_HOST");
  });

  test("no secrets in the client bundle", async ({ page }) => {
    const bodies: string[] = [];
    page.on("response", async (r) => {
      if (r.url().includes("/_next/static/") && r.url().endsWith(".js")) bodies.push(await r.text().catch(() => ""));
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const all = bodies.join("\n");
    expect(all.length).toBeGreaterThan(1000);
    for (const needle of ["GROQ_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SMTP_PASS", "gsk_", "service_role"]) {
      expect(all).not.toContain(needle);
    }
  });

  test("theme toggle switches to dark and back", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /theme/i });
    await toggle.click(); // system -> light
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await toggle.click(); // light -> dark
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  for (const path of ["/", "/help", "/legal/terms", "/support", "/history"]) {
    test(`axe: no serious accessibility violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  }
});

test.describe("Mobile @mobile", () => {
  test("@mobile no horizontal scroll and menu works", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.locator("#mobile-nav").getByRole("link", { name: "Help" }).click();
    await expect(page).toHaveURL(/\/help$/);
  });
});
