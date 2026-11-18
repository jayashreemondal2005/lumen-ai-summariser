"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock,
  Globe,
  Link2,
  Lock,
  RotateCcw,
  ServerCrash,
  ShieldOff,
  X,
} from "lucide-react";
import { LENGTH_LABELS, SUMMARY_LENGTHS, type SummaryLength } from "@/lib/config";
import type { SummariseStage } from "@/lib/schemas";
import { useConsent, useSummariser, type SummariserError } from "@/lib/client/stores";
import { clientUrlProblem, openTara } from "@/lib/client/format";
import { useAuth, useToast } from "../providers";
import { Button, Spinner } from "../ui";
import { SummaryView } from "./summary-view";

const EXAMPLES = [
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

function LengthPicker({ value, onChange, disabled }: { value: SummaryLength; onChange: (l: SummaryLength) => void; disabled?: boolean }) {
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

function StageProgress({ stage, completed }: { stage: SummariseStage | null; completed: SummariseStage[] }) {
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

function ErrorPanel({ error, onRetry, onEdit }: { error: SummariserError; onRetry: () => void; onEdit: () => void }) {
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

function HowItWorks() {
  const steps = [
    { n: "1", t: "Paste a link", d: "Any public article, doc, blog post or product page." },
    { n: "2", t: "Lumen reads it", d: "It strips menus and ads and finds the main text." },
    { n: "3", t: "Get the gist", d: "A TL;DR, a clear summary and the key points." },
  ];
  return (
    <section aria-labelledby="how-h" className="mt-16">
      <h2 id="how-h" className="sr-only">
        How it works
      </h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="rounded-2xl border border-line bg-surface p-5">
            <span className="text-[13px] font-semibold text-primary-ink">{s.n}</span>
            <p className="mt-2 font-medium text-ink">{s.t}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-3">{s.d}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-[13px] text-ink-3">
        Free to use without an account. Guest history stays in your browser.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function Summariser() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const requireConsent = useConsent((s) => s.requireConsent);
  const { url, length, status, stage, completed, result, error, setUrl, setLength, run, cancel, reset } = useSummariser();
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("welcome") === "1") {
      toast("Email verified. You're signed in.", "success");
      router.replace("/");
    }
    const prefill = params.get("url");
    if (prefill && !url) setUrl(prefill.slice(0, 2048));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "success" || status === "error") {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  function submit(target = url) {
    const problem = clientUrlProblem(target);
    if (problem) {
      setFieldError(problem);
      inputRef.current?.focus();
      return;
    }
    setFieldError(null);
    requireConsent(() => run({ url: target.trim(), length, signedIn: Boolean(user) }));
  }

  const loading = status === "loading";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <section className="pt-14 text-center sm:pt-20">
        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[56px]">
          Clarity for every page.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-ink-2">
          Paste a link to any article, doc or blog post. Lumen reads it and gives you the summary and the key points.
        </p>
      </section>

      <form
        className="mt-10"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Web page address
        </label>
        <div
          className={`flex items-center gap-2 rounded-2xl border bg-surface p-2 pl-4 shadow-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 ${
            fieldError ? "border-danger" : "border-line-strong"
          }`}
        >
          <Link2 className="size-5 shrink-0 text-ink-3" aria-hidden />
          <input
            ref={inputRef}
            id={inputId}
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? `${inputId}-err` : undefined}
            disabled={loading}
            className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-ink-3 focus:outline-none disabled:opacity-70"
          />
          {url && !loading ? (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                inputRef.current?.focus();
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
              aria-label="Clear address"
            >
              <X className="size-4" />
            </button>
          ) : null}
          {loading ? (
            <Button variant="secondary" size="lg" onClick={cancel} className="h-11">
              Cancel
            </Button>
          ) : (
            <Button type="submit" size="lg" className="h-11">
              Summarise <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
        {fieldError ? (
          <p id={`${inputId}-err`} role="alert" className="mt-2 pl-1 text-sm text-danger">
            {fieldError}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <LengthPicker value={length} onChange={setLength} disabled={loading} />
          <p className="text-[13px] text-ink-3">{LENGTH_LABELS[length].hint}</p>
        </div>
      </form>

      {status === "idle" ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[13px] text-ink-3">Try</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              type="button"
              onClick={() => {
                setUrl(ex.url);
                submit(ex.url);
              }}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              {ex.label}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={resultRef} className="mt-10 scroll-mt-24" aria-live="polite">
        {loading ? <StageProgress stage={stage} completed={completed} /> : null}
        {status === "error" && error ? (
          <ErrorPanel
            error={error}
            onRetry={() => submit()}
            onEdit={() => {
              reset();
              setUrl(url);
              requestAnimationFrame(() => inputRef.current?.select());
            }}
          />
        ) : null}
        {status === "success" && result ? (
          <>
            <SummaryView
              result={result}
              savedLabel={result.saved ? "Saved to your history" : user ? "Not saved" : "Saved in this browser"}
            />
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
              >
                Summarise another page
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {status === "idle" ? <HowItWorks /> : null}
    </div>
  );
}
