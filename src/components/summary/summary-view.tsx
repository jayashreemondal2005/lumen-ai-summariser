"use client";
import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  Languages,
  Minimize2,
  Pause,
  Share2,
  ShieldAlert,
  Sparkles,
  Volume2,
  Wand2,
} from "lucide-react";
import type { RewriteMode, SummaryResult } from "@/lib/schemas";
import { LANGUAGES, LENGTH_LABELS, STYLE_LABELS, isRtl, languageName, type LanguageCode } from "@/lib/config";
import { hostOf, slugify, toMarkdown, toPlainText } from "@/lib/client/format";
import { useToast } from "../providers";
import { Spinner } from "../ui";
import { useSpeech } from "./use-speech";
import { AskPage } from "./ask-page";

type Content = Pick<SummaryResult, "title" | "tldr" | "summary" | "keyPoints" | "topics">;

function Notice({ tone, icon: Icon, title, children }: { tone: "warn" | "info"; icon: typeof AlertTriangle; title: string; children: React.ReactNode }) {
  return (
    <div className={`flex gap-3 rounded-xl px-4 py-3 text-sm ${tone === "warn" ? "bg-warning-soft text-ink" : "bg-primary-soft text-ink"}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone === "warn" ? "text-warning" : "text-primary-ink"}`} aria-hidden />
      <p>
        <span className="font-semibold">{title}</span> <span className="text-ink-2">{children}</span>
      </p>
    </div>
  );
}

function ToolButton({ onClick, children, active, label, disabled }: { onClick: () => void; children: React.ReactNode; active?: boolean; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={`press inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium disabled:opacity-50 ${
        active ? "bg-primary-soft text-primary-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const CONTENT_LABEL: Record<string, string> = {
  article: "Article",
  news: "News",
  blog: "Blog post",
  documentation: "Documentation",
  product: "Product page",
  reference: "Reference",
  forum: "Discussion",
  other: "Web page",
};

export function SummaryView({ result, savedLabel }: { result: SummaryResult; savedLabel?: string }) {
  const toast = useToast();
  const speech = useSpeech();
  const [copied, setCopied] = useState(false);
  const [alt, setAlt] = useState<{ content: Content; label: string; language: LanguageCode } | null>(null);
  const [busy, setBusy] = useState<RewriteMode | null>(null);
  const [translateTo, setTranslateTo] = useState<LanguageCode>(result.language === "en" ? "hi" : "en");
  const host = hostOf(result.finalUrl);
  const originalHref = /^https?:\/\//i.test(result.finalUrl) ? result.finalUrl : undefined;
  const monogram = (result.siteName || host).trim().charAt(0).toUpperCase() || "L";

  const shown: Content = alt?.content ?? result;
  const shownLang = alt?.language ?? result.language;
  const rtl = isRtl(shownLang);
  const view: SummaryResult = { ...result, ...shown };

  async function copy() {
    try {
      await navigator.clipboard.writeText(toPlainText(view));
      setCopied(true);
      toast("Summary copied", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Couldn't copy. Select the text and copy it manually.", "error");
    }
  }

  function download() {
    const blob = new Blob([toMarkdown(view)], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slugify(result.title)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function share() {
    const link = `${window.location.origin}/?url=${encodeURIComponent(result.url)}`;
    const text = `${shown.title}\n\n${shown.tldr}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shown.title, text, url: link });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n\nSummarise it with Lumen: ${link}`);
      toast("Link and TL;DR copied", "success");
    } catch {
      /* cancelled */
    }
  }

  function listen() {
    if (speech.speaking) return speech.stop();
    speech.speak([shown.title, shown.tldr, shown.summary, ...shown.keyPoints].join(". "), shownLang);
  }

  async function rewrite(mode: RewriteMode) {
    if (busy) return;
    setBusy(mode);
    speech.stop();
    const language = mode === "translate" ? translateTo : shownLang;
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          language,
          content: { title: shown.title, tldr: shown.tldr, summary: shown.summary, keyPoints: shown.keyPoints, topics: shown.topics },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.content) {
        toast(data?.error?.message || "Couldn't rewrite just now.", "error");
        return;
      }
      const label = mode === "simpler" ? "Simpler version" : mode === "shorter" ? "Shorter version" : `${languageName(language)} translation`;
      setAlt({ content: data.content, label, language });
    } catch {
      toast("You seem to be offline.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="animate-rise overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-labelledby="summary-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-7">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[13px] font-semibold text-ink-2 ring-1 ring-line">
            {monogram}
          </span>
          <div className="min-w-0 text-[13px] leading-tight">
            <p className="truncate font-medium text-ink">{result.siteName || host}</p>
            <p className="truncate text-ink-3">
              {result.readingMinutes} min read · {result.wordCount.toLocaleString("en-IN")} words · {CONTENT_LABEL[result.contentType] ?? "Web page"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolButton onClick={copy} label="Copy summary">
            {copied ? <Check className="size-4 text-accent-ink" /> : <Copy className="size-4" />} Copy
          </ToolButton>
          <ToolButton onClick={download} label="Download as Markdown">
            <Download className="size-4" /> Markdown
          </ToolButton>
          {speech.supported ? (
            <ToolButton onClick={listen} active={speech.speaking} label={speech.speaking ? "Stop listening" : "Listen (read aloud)"}>
              {speech.speaking ? <Pause className="size-4" /> : <Volume2 className="size-4" />} {speech.speaking ? "Stop" : "Listen"}
            </ToolButton>
          ) : null}
          <ToolButton onClick={share} label="Share">
            <Share2 className="size-4" /> Share
          </ToolButton>
          <a
            href={originalHref}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="press inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <ExternalLink className="size-4" /> Original<span className="sr-only"> page (opens in a new tab)</span>
          </a>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="rounded-full bg-primary-soft px-2 py-0.5 font-medium text-primary-ink">{LENGTH_LABELS[result.length].label}</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium text-ink-2">{STYLE_LABELS[result.style]?.label ?? "Balanced"}</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium text-ink-2">{languageName(shownLang)}</span>
          {alt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-ink">
              <Sparkles className="size-3" /> {alt.label}
              <button type="button" onClick={() => setAlt(null)} className="ml-1 underline underline-offset-2">
                Show original
              </button>
            </span>
          ) : null}
        </div>

        <div dir={rtl ? "rtl" : undefined}>
          <h2 id="summary-title" className="text-[22px] font-semibold leading-snug tracking-[-0.015em] text-ink sm:text-[26px]">
            {shown.title}
          </h2>

          <div className="mt-4 flex flex-col gap-2 empty:hidden" dir="ltr">
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
            <p className="reading-ui mt-1 text-[15px] leading-relaxed text-ink">{shown.tldr}</p>
          </section>

          <section aria-labelledby="summary-h" className="mt-6">
            <h3 id="summary-h" className="sr-only">
              Summary
            </h3>
            <div className="reading space-y-4 font-serif text-[17px] leading-[1.7] text-ink">
              {shown.summary.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          <section aria-labelledby="kp-h" className="mt-8">
            <h3 id="kp-h" className="text-sm font-semibold text-ink">
              Key points
            </h3>
            <ol className="mt-3 space-y-3">
              {shown.keyPoints.map((k, i) => (
                <li key={i} className="reading-ui flex gap-3 text-[15px] leading-relaxed text-ink-2">
                  <span aria-hidden className="mt-[3px] flex size-[22px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent-ink">
                    {i + 1}
                  </span>
                  <span>{k}</span>
                </li>
              ))}
            </ol>
          </section>

          {shown.topics.length ? (
            <ul aria-label="Topics" className="mt-7 flex flex-wrap gap-2">
              {shown.topics.map((t) => (
                <li key={t} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-ink-2">
                  {t}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2.5" role="group" aria-label="AI tools">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            <Wand2 className="size-3.5" /> AI tools
          </span>
          <ToolButton onClick={() => rewrite("simpler")} disabled={Boolean(busy)}>
            {busy === "simpler" ? <Spinner className="size-3.5" /> : <Sparkles className="size-3.5" />} Simpler
          </ToolButton>
          <ToolButton onClick={() => rewrite("shorter")} disabled={Boolean(busy)}>
            {busy === "shorter" ? <Spinner className="size-3.5" /> : <Minimize2 className="size-3.5" />} Shorter
          </ToolButton>
          <span className="inline-flex items-center gap-1">
            <label htmlFor="translate-to" className="sr-only">
              Translate to
            </label>
            <select
              id="translate-to"
              value={translateTo}
              onChange={(e) => setTranslateTo(e.target.value as LanguageCode)}
              className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink-2"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <ToolButton onClick={() => rewrite("translate")} disabled={Boolean(busy)}>
              {busy === "translate" ? <Spinner className="size-3.5" /> : <Languages className="size-3.5" />} Translate
            </ToolButton>
          </span>
        </div>
      </div>

      <AskPage url={result.url} language={shownLang} />

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
