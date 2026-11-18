"use client";
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Copy, Download, ExternalLink, FileWarning, ShieldAlert } from "lucide-react";
import type { SummaryResult } from "@/lib/schemas";
import { LENGTH_LABELS } from "@/lib/config";
import { hostOf, slugify, toMarkdown, toPlainText } from "@/lib/client/format";
import { useToast } from "../providers";

function Notice({ tone, icon: Icon, title, children }: { tone: "warn" | "info"; icon: typeof AlertTriangle; title: string; children: React.ReactNode }) {
  return (
    <div
      className={`flex gap-3 rounded-xl px-4 py-3 text-sm ${
        tone === "warn" ? "bg-warning-soft text-ink" : "bg-primary-soft text-ink"
      }`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone === "warn" ? "text-warning" : "text-primary-ink"}`} aria-hidden />
      <p>
        <span className="font-semibold">{title}</span> <span className="text-ink-2">{children}</span>
      </p>
    </div>
  );
}

export function SummaryView({ result, savedLabel }: { result: SummaryResult; savedLabel?: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const host = hostOf(result.finalUrl);
  const monogram = (result.siteName || host).trim().charAt(0).toUpperCase() || "L";

  async function copy() {
    try {
      await navigator.clipboard.writeText(toPlainText(result));
      setCopied(true);
      toast("Summary copied", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Couldn't copy. Select the text and copy it manually.", "error");
    }
  }

  function download() {
    const blob = new Blob([toMarkdown(result)], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slugify(result.title)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return (
    <article className="animate-rise overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-labelledby="summary-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-7">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[13px] font-semibold text-ink-2 ring-1 ring-line">
            {monogram}
          </span>
          <div className="min-w-0 text-[13px] leading-tight">
            <p className="truncate font-medium text-ink">{result.siteName || host}</p>
            <p className="truncate text-ink-3">
              {result.readingMinutes} min read · {result.wordCount.toLocaleString("en-IN")} words · {LENGTH_LABELS[result.length].label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={copy} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            {copied ? <Check className="size-4 text-accent-ink" /> : <Copy className="size-4" />} Copy
          </button>
          <button type="button" onClick={download} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            <Download className="size-4" /> Markdown
          </button>
          <a
            href={result.finalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <ExternalLink className="size-4" /> Original<span className="sr-only"> page (opens in a new tab)</span>
          </a>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <h2 id="summary-title" className="text-[22px] font-semibold leading-snug tracking-[-0.015em] text-ink sm:text-[26px]">
          {result.title}
        </h2>

        <div className="mt-4 flex flex-col gap-2 empty:hidden">
          {result.injectionDetected ? (
            <Notice tone="warn" icon={ShieldAlert} title="Hidden instructions ignored.">
              This page contains text aimed at AI tools. Lumen treated it as page content and didn&apos;t follow it.
            </Notice>
          ) : null}
          {result.quality === "low" ? (
            <Notice tone="warn" icon={FileWarning} title="Limited content.">
              The page had little readable text (it may need a login or JavaScript), so this summary may be thin.
            </Notice>
          ) : null}
          {result.truncated ? (
            <Notice tone="info" icon={AlertTriangle} title="Long page.">
              This summary covers the first part of the page.
            </Notice>
          ) : null}
        </div>

        <section aria-label="TL;DR" className="mt-5 rounded-xl border border-line bg-bg-subtle px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-ink">TL;DR</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">{result.tldr}</p>
        </section>

        <section aria-labelledby="summary-h" className="mt-6">
          <h3 id="summary-h" className="sr-only">
            Summary
          </h3>
          <div className="space-y-4 font-serif text-[17px] leading-[1.7] text-ink">
            {result.summary.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section aria-labelledby="kp-h" className="mt-8">
          <h3 id="kp-h" className="text-sm font-semibold text-ink">
            Key points
          </h3>
          <ol className="mt-3 space-y-3">
            {result.keyPoints.map((k, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                <span aria-hidden className="mt-[3px] flex size-[22px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent-ink">
                  {i + 1}
                </span>
                <span>{k}</span>
              </li>
            ))}
          </ol>
        </section>

        {result.topics.length ? (
          <ul aria-label="Topics" className="mt-7 flex flex-wrap gap-2">
            {result.topics.map((t) => (
              <li key={t} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-ink-2">
                {t}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 border-t border-line bg-bg-subtle px-5 py-3 text-[12px] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p>
          AI-generated. Check important facts against the original page.{" "}
          <Link href="/legal/ai-disclaimer" className="link">
            AI Disclaimer
          </Link>
        </p>
        {savedLabel ? <p>{savedLabel}</p> : null}
      </div>
    </article>
  );
}
