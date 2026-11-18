"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardPaste, Globe, Link2, X } from "lucide-react";
import { LANGUAGES, LENGTH_LABELS, STYLE_LABELS, STYLES, type LanguageCode, type SummaryStyle } from "@/lib/config";
import { useConsent, usePrefs, useSummariser } from "@/lib/client/stores";
import { clientUrlProblem } from "@/lib/client/format";
import { useAuth, useToast } from "../providers";
import { Button } from "../ui";
import { SummaryView } from "./summary-view";
import { HomeSections } from "./home-sections";
import { EXAMPLES, ErrorPanel, LengthPicker, StageProgress } from "./summariser-parts";
import { ProductTour } from "../tour/product-tour";

function OptionSelect<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  icon,
  disabled,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ v: T; text: string }>;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <span className="relative inline-flex items-center">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="pointer-events-none absolute left-2.5 text-ink-3" aria-hidden>
        {icon}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="press h-10 max-w-[13rem] appearance-none truncate rounded-[10px] border border-line bg-surface pl-8 pr-7 text-[13px] font-medium text-ink-2 hover:border-line-strong focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.text}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 text-[10px] text-ink-3" aria-hidden>
        ▾
      </span>
    </span>
  );
}

export function Summariser() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const requireConsent = useConsent((s) => s.requireConsent);
  const saveHistory = usePrefs((s) => s.saveHistory);
  const { url, length, status, stage, completed, result, error, setUrl, setLength, run, cancel, reset } = useSummariser();
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [style, setStyle] = useState<SummaryStyle>("neutral");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [canPaste, setCanPaste] = useState(false);

  useEffect(() => {
    // Defaults chosen in Settings (stored in this browser).
    const p = usePrefs.getState();
    setLength(p.defaultLength);
    setLanguage(p.language);
    setStyle(p.style);
    setCanPaste(typeof navigator !== "undefined" && Boolean(navigator.clipboard?.readText));
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      toast("Email verified. You're signed in.", "success");
      router.replace("/");
    }
    const prefill = params.get("url");
    if (prefill && !useSummariser.getState().url) setUrl(prefill.slice(0, 2048));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "/" focuses the link box from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if ((status === "success" || status === "error") && usePrefs.getState().autoScroll) {
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
    requireConsent(() =>
      run({ url: target.trim(), length, signedIn: Boolean(user), language, style, save: usePrefs.getState().saveHistory }),
    );
  }

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setUrl(text.slice(0, 2048));
        setFieldError(null);
        inputRef.current?.focus();
      }
    } catch {
      toast("Allow clipboard access, or press Ctrl+V in the box.", "error");
    }
  }

  const loading = status === "loading";

  return (
    <div className="surface-glow">
      <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <section className="pt-14 text-center sm:pt-20">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-medium text-ink-2 shadow-hair">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden /> AI website summariser · free, no sign-up needed
          </p>
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[58px]">Clarity for every page.</h1>
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
            data-tour="url"
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
              aria-describedby={fieldError ? `${inputId}-err` : `${inputId}-hint`}
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
                className="press inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                aria-label="Clear address"
              >
                <X className="size-4" />
              </button>
            ) : !url && canPaste && !loading ? (
              <button
                type="button"
                onClick={paste}
                className="press hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-3 hover:bg-surface-2 hover:text-ink sm:inline-flex"
              >
                <ClipboardPaste className="size-4" /> Paste
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
          ) : (
            <p id={`${inputId}-hint`} className="sr-only">
              Tip: press the slash key to jump to this box.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-between" data-tour="options">
            <LengthPicker value={length} onChange={setLength} disabled={loading} />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <OptionSelect
                id="opt-language"
                label="Summary language"
                value={language}
                onChange={setLanguage}
                disabled={loading}
                icon={<Globe className="size-3.5" />}
                options={LANGUAGES.map((l) => ({ v: l.code, text: l.code === "en" ? "English" : `${l.name} · ${l.native}` }))}
              />
              <OptionSelect
                id="opt-style"
                label="Writing style"
                value={style}
                onChange={setStyle}
                disabled={loading}
                icon={<span className="text-[11px] font-bold">Aa</span>}
                options={STYLES.map((s) => ({ v: s, text: STYLE_LABELS[s].label }))}
              />
            </div>
          </div>
          <p className="mt-2.5 text-center text-[12px] text-ink-3 sm:text-left">
            {LENGTH_LABELS[length].hint} · {STYLE_LABELS[style].hint}
          </p>
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
                className="press rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:border-line-strong hover:text-ink"
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
                const keep = url;
                reset();
                setUrl(keep);
                requestAnimationFrame(() => inputRef.current?.select());
              }}
            />
          ) : null}
          {status === "success" && result ? (
            <>
              <SummaryView
                key={result.id}
                result={result}
                savedLabel={result.saved ? "Saved to your history" : user ? "Not saved" : saveHistory ? "Saved in this browser" : "Not saved (history is off)"}
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

        {status === "idle" ? <HomeSections /> : null}
      </div>
      <ProductTour />
    </div>
  );
}
