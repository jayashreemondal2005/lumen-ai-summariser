"use client";
import { useRef } from "react";
import { Check, CircleAlert, Clock, Globe, Lock, RotateCcw, ServerCrash, ShieldOff } from "lucide-react";
import { LENGTH_LABELS, SUMMARY_LENGTHS, type SummaryLength } from "@/lib/config";
import type { SummariseStage } from "@/lib/schemas";
import type { SummariserError } from "@/lib/client/stores";
import { openTara } from "@/lib/client/format";
import { Button, Spinner } from "../ui";

export const EXAMPLES = [
  { label: "Rabindranath Tagore", url: "https://en.wikipedia.org/wiki/Rabindranath_Tagore" },
  { label: "How to Do Great Work", url: "https://paulgraham.com/greatwork.html" },
  { label: "Content Security Policy (MDN)", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy" },
];

const STAGES: Array<{ key: SummariseStage; label: string }> = [
  { key: "fetching", label: "Fetching the page" },
  { key: "extracting", label: "Finding the main content" },
  { key: "summarising", label: "Writing the summary" },
];

/* ------------------------------------------------------------------ */

export function LengthPicker({ value, onChange, disabled }: { value: SummaryLength; onChange: (l: SummaryLength) => void; disabled?: boolean }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : SUMMARY_LENGTHS.length - 1)) % SUMMARY_LENGTHS.length;
    onChange(SUMMARY_LENGTHS[next]!);
    refs.current[next]?.focus();
  }
  return (
    <div role="radiogroup" aria-label="Summary length" className="inline-flex rounded-[10px] bg-surface-2 p-1">
      {SUMMARY_LENGTHS.map((l, i) => {
        const active = l === value;
        return (
          <button
            key={l}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            title={LENGTH_LABELS[l].hint}
            onClick={() => onChange(l)}
            onKeyDown={(e) => onKey(e, i)}
            className={`h-8 rounded-[7px] px-3.5 text-[13px] font-medium transition-all ${
              active ? "bg-surface text-ink shadow-hair ring-1 ring-line" : "text-ink-3 hover:text-ink"
            }`}
          >
            {LENGTH_LABELS[l].label}
          </button>
        );
      })}
    </div>
  );
}

export function StageProgress({ stage, completed }: { stage: SummariseStage | null; completed: SummariseStage[] }) {
  const current = stage === "validating" ? "fetching" : stage;
  return (
    <div className="animate-rise rounded-2xl border border-line bg-surface p-5 shadow-hair sm:p-7" aria-busy="true">
      <ol className="space-y-3" aria-label="Progress">
        {STAGES.map((s) => {
          const done = completed.includes(s.key) || (current === "saving" && s.key !== "saving");
          const active = current === s.key;
          return (
            <li key={s.key} className="flex items-center gap-3 text-sm">
              <span
                className={`flex size-6 items-center justify-center rounded-full ${
                  done ? "bg-accent-soft text-accent-ink" : active ? "bg-primary-soft text-primary-ink" : "bg-surface-2 text-ink-3"
                }`}
                aria-hidden
              >
                {done ? <Check className="size-3.5" strokeWidth={2.5} /> : active ? <Spinner className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <span className={done ? "text-ink-2" : active ? "font-medium text-ink" : "text-ink-3"}>
                {s.label}
                {active ? <span className="sr-only"> (in progress)</span> : done ? <span className="sr-only"> (done)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-7 space-y-3" aria-hidden>
        <div className="skeleton h-6 w-3/4" />
        <div className="skeleton h-16 w-full rounded-xl" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-4/5" />
      </div>
    </div>
  );
}

const ERROR_COPY: Record<string, { title: string; icon: typeof CircleAlert; hint?: string }> = {
  INVALID_URL: { title: "Check the address", icon: CircleAlert },
  UNSUPPORTED_SCHEME: { title: "Check the address", icon: CircleAlert },
  BLOCKED_HOST: { title: "This address can't be opened", icon: ShieldOff, hint: "For security, Lumen only opens public websites." },
  BLOCKED_PORT: { title: "This address can't be opened", icon: ShieldOff, hint: "For security, Lumen only opens public websites." },
  DNS_FAILED: { title: "Website not found", icon: Globe },
  TIMEOUT: { title: "The site took too long", icon: Clock },
  TOO_LARGE: { title: "This page is too large", icon: CircleAlert },
  UNSUPPORTED_TYPE: { title: "That's not a web page", icon: CircleAlert },
  HTTP_ERROR: { title: "The site didn't return the page", icon: Lock, hint: "Some sites block automated readers. Try another article from the same site." },
  TOO_MANY_REDIRECTS: { title: "Too many redirects", icon: CircleAlert },
  NETWORK: { title: "Couldn't connect to the site", icon: Globe },
  NO_CONTENT: { title: "No readable text found", icon: CircleAlert, hint: "Pages built with JavaScript, behind a login, or made of images can't be read yet." },
  AI_BUSY: { title: "Lumen is busy right now", icon: ServerCrash },
  AI_NOT_CONFIGURED: { title: "Summaries are unavailable", icon: ServerCrash },
  RATE_LIMITED: { title: "Let's slow down a little", icon: Clock },
  OFFLINE: { title: "You're offline", icon: Globe },
  STREAM: { title: "The connection dropped", icon: Globe },
};

export function ErrorPanel({ error, onRetry, onEdit }: { error: SummariserError; onRetry: () => void; onEdit: () => void }) {
  const copy = ERROR_COPY[error.code] ?? { title: "Something went wrong", icon: CircleAlert };
  const Icon = copy.icon;
  return (
    <div role="alert" className="animate-rise rounded-2xl border border-line bg-surface p-5 shadow-hair sm:p-7">
      <div className="flex gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger" aria-hidden>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{copy.title}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{error.message}</p>
          {copy.hint ? <p className="mt-1 text-sm text-ink-3">{copy.hint}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {error.retryable ? (
              <Button size="sm" onClick={onRetry}>
                <RotateCcw className="size-3.5" /> Try again
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={onEdit}>
              Edit the link
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openTara("Why won't a page summarise?")}>
              Ask Tara why
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
