"use client";
import { useRef, useState } from "react";
import { ArrowUp, MessageSquareQuote, SearchX } from "lucide-react";
import { isRtl } from "@/lib/config";
import { Spinner } from "../ui";

interface Turn {
  q: string;
  a?: string;
  quotes?: string[];
  answerable?: boolean;
  error?: string;
}

const SUGGESTIONS = ["What is the main argument?", "Are there any numbers or dates?", "Who is this written for?"];

/** "Ask about this page": answers grounded in the page, with verified quotes. */
export function AskPage({ url, language }: { url: string; language: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rtl = isRtl(language);

  async function ask(question: string) {
    const text = question.trim();
    if (text.length < 2 || busy) return;
    const history = turns.filter((t) => t.a).slice(-3).map((t) => ({ q: t.q, a: t.a!.slice(0, 1400) }));
    setTurns((t) => [...t, { q: text }]);
    setQ("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, question: text, language, history }),
      });
      const data = await res.json().catch(() => null);
      setTurns((t) => {
        const copy = [...t];
        const last = copy[copy.length - 1]!;
        if (!res.ok || !data) copy[copy.length - 1] = { ...last, error: data?.error?.message || "Couldn't answer just now. Please try again." };
        else copy[copy.length - 1] = { ...last, a: data.answer, quotes: data.quotes, answerable: data.answerable };
        return copy;
      });
    } catch {
      setTurns((t) => {
        const copy = [...t];
        copy[copy.length - 1] = { ...copy[copy.length - 1]!, error: "You seem to be offline." };
        return copy;
      });
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <section aria-labelledby="ask-h" className="border-t border-line px-5 py-6 sm:px-7">
      <div className="flex items-center gap-2">
        <MessageSquareQuote className="size-4 text-primary-ink" aria-hidden />
        <h3 id="ask-h" className="text-sm font-semibold text-ink">
          Ask about this page
        </h3>
      </div>
      <p className="mt-1 text-[13px] text-ink-3">Answers come only from the page, with the passages that support them.</p>

      {turns.length ? (
        <ul className="mt-4 space-y-4" aria-live="polite">
          {turns.map((t, i) => (
            <li key={i} className="animate-rise space-y-2">
              <p className="text-sm font-medium text-ink">{t.q}</p>
              {t.error ? (
                <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{t.error}</p>
              ) : t.a === undefined ? (
                <div className="space-y-2" aria-label="Answering">
                  <div className="skeleton h-4 w-11/12" />
                  <div className="skeleton h-4 w-3/4" />
                </div>
              ) : (
                <div className="rounded-xl bg-bg-subtle px-4 py-3">
                  {t.answerable === false ? (
                    <p className="mb-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-warning">
                      <SearchX className="size-3.5" /> Not covered by this page
                    </p>
                  ) : null}
                  <p dir={rtl ? "rtl" : undefined} className="reading-ui whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                    {t.a}
                  </p>
                  {t.quotes?.length ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">From the page</p>
                      {t.quotes.map((quote, j) => (
                        <blockquote key={j} className="border-l-2 border-accent pl-3 font-serif text-[14px] italic leading-relaxed text-ink-2">
                          “{quote}”
                        </blockquote>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="press rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-2 hover:border-line-strong hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface py-1.5 pl-3.5 pr-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
          <label htmlFor="ask-input" className="sr-only">
            Ask a question about this page
          </label>
          <input
            id="ask-input"
            ref={inputRef}
            value={q}
            maxLength={400}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask anything about this page…"
            className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || q.trim().length < 2}
            aria-label="Ask"
            className="press inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary disabled:opacity-40"
          >
            {busy ? <Spinner className="size-4" /> : <ArrowUp className="size-4" />}
          </button>
        </div>
      </form>
    </section>
  );
}
