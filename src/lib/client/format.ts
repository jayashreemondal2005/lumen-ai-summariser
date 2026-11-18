import type { SummaryResult } from "../schemas";

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export function toMarkdown(s: SummaryResult): string {
  return [
    `# ${s.title}`,
    "",
    `Source: ${s.finalUrl}`,
    `Summarised by Lumen on ${new Date(s.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} (${s.length})`,
    "",
    "## TL;DR",
    s.tldr,
    "",
    "## Summary",
    s.summary,
    "",
    "## Key points",
    ...s.keyPoints.map((k) => `- ${k}`),
    ...(s.topics.length ? ["", `Topics: ${s.topics.join(", ")}`] : []),
    "",
    "_AI-generated summary. Check important facts against the original page._",
    "",
  ].join("\n");
}

export function toPlainText(s: SummaryResult): string {
  return [
    s.title,
    s.finalUrl,
    "",
    `TL;DR: ${s.tldr}`,
    "",
    s.summary,
    "",
    "Key points:",
    ...s.keyPoints.map((k) => `• ${k}`),
  ].join("\n");
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "summary"
  );
}

/** Quick client-side check so obvious typos are caught before a request. */
export function clientUrlProblem(input: string): string | null {
  const v = input.trim();
  if (!v) return "Enter a web address.";
  if (/\s/.test(v)) return "Web addresses can't contain spaces.";
  if (v.length > 2048) return "That address is too long.";
  if (/^(javascript|data|file|ftp|mailto|chrome|about):/i.test(v)) return "Only http and https web pages can be summarised.";
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".") && !u.hostname.startsWith("[")) return "Use a full web address, like example.com/article.";
  } catch {
    return "That doesn't look like a valid web address.";
  }
  return null;
}

export function openTara(question?: string) {
  window.dispatchEvent(new CustomEvent("lumen:open-tara", { detail: { question } }));
}
