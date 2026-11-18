import { describe, expect, it } from "vitest";
import { customerConfirmationEmail, escapeHtml, headerSafe, supportInboxEmail, type TicketEmailData } from "@/lib/server/email-templates";
import { generateTicketRef, spamCheck } from "@/lib/server/tickets";
import { searchHelp } from "@/lib/help-center";

const base: TicketEmailData = {
  ticketRef: "LUM-261118-7K4Q",
  name: "Asha <script>alert(1)</script> Roy",
  email: "asha@example.com",
  category: "summary-quality",
  subject: "Wrong summary\r\nBcc: victim@example.com",
  message: "Line one <img src=x onerror=alert(1)>\nLine two & \"quotes\"",
  source: "tara",
  transcript: [
    { role: "user", text: "Why is it wrong? <b>bold</b>" },
    { role: "assistant", text: "I couldn't find that." },
  ],
  createdAt: new Date("2026-11-18T10:00:00Z"),
  appUrl: "https://lumen-ai-summariser.netlify.app",
  logoCid: "lumen-logo@lumen",
  signedIn: false,
};

describe("ticket emails", () => {
  const customer = customerConfirmationEmail(base);
  const inbox = supportInboxEmail(base);

  it("escapes every piece of user text in HTML", () => {
    for (const html of [customer.html, inbox.html]) {
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("<img src=x");
      expect(html).not.toContain("<b>bold</b>");
      expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    }
    expect(inbox.html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(inbox.html).toContain("&quot;quotes&quot;");
  });

  it("keeps subjects on one line (no header injection)", () => {
    expect(customer.subject).not.toMatch(/[\r\n]/);
    expect(inbox.subject).not.toMatch(/[\r\n]/);
    expect(inbox.subject).toContain("[LUM-261118-7K4Q]");
  });

  it("confirmation includes greeting, ticket ID, logo, app link and help link", () => {
    expect(customer.html).toContain("Hello Asha");
    expect(customer.html).toContain("LUM-261118-7K4Q");
    expect(customer.html).toContain('src="cid:lumen-logo@lumen"');
    expect(customer.html).toContain('href="https://lumen-ai-summariser.netlify.app"');
    expect(customer.html).toContain("/help");
    expect(customer.text).toContain("Ticket ID: LUM-261118-7K4Q");
    expect(customer.subject).toBe("[LUM-261118-7K4Q] We've received your request");
  });

  it("support inbox email includes the Tara transcript and channel", () => {
    expect(inbox.html).toContain("Escalated from Ask Tara");
    expect(inbox.html).toContain("I couldn&#39;t find that.");
    expect(inbox.text).toContain("Channel: Ask Tara");
  });

  it("formats the time in IST", () => {
    expect(customer.text).toMatch(/3:30\s?pm IST/i);
  });
});

describe("helpers", () => {
  it("escapeHtml covers the five special characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });

  it("headerSafe removes CR/LF, controls and clamps length", () => {
    expect(headerSafe("a\r\nb c\u0000d", 100)).toBe("a b cd");
    expect(headerSafe("x".repeat(300), 50)).toHaveLength(50);
  });

  it("ticket refs use the IST date and an unambiguous suffix", () => {
    const ref = generateTicketRef(new Date("2026-11-18T20:00:00Z")); // 01:30 IST on the 19th
    expect(ref).toMatch(/^LUM-261119-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/);
    const many = new Set(Array.from({ length: 200 }, () => generateTicketRef()));
    expect(many.size).toBeGreaterThan(190);
  });
});

describe("spam checks", () => {
  const ok = { subject: "Summary issue", message: "The summary for this page left out the main argument." };
  it("lets normal messages through", () => {
    expect(spamCheck({ ...ok, elapsedMs: 15_000 }).spam).toBe(false);
  });
  it.each([
    ["honeypot", { ...ok, website: "http://spam.example" }],
    ["too fast", { ...ok, elapsedMs: 600 }],
    ["too many links", { ...ok, message: "http://a.example http://b.example http://c.example www.d.example" }],
    ["repeated characters", { ...ok, message: "a".repeat(40) }],
    ["keywords", { ...ok, message: "Cheap SEO services and backlinks for your site" }],
  ])("flags %s", (_n, input) => {
    expect(spamCheck(input).spam).toBe(true);
  });
});

describe("Help Center retrieval (used by Ask Tara)", () => {
  it.each([
    ["why won't my page summarise", "page-failed"],
    ["how do I reset my password", "password"],
    ["is my data sold or tracked", "privacy-data"],
    ["what does brief vs detailed mean", "length-options"],
    ["delete my account", "delete-account"],
  ])("“%s” finds %s first", (q, id) => {
    expect(searchHelp(q)[0]?.article.id).toBe(id);
  });

  it("returns nothing for unrelated questions", () => {
    expect(searchHelp("what is the capital of peru")).toHaveLength(0);
  });
});
