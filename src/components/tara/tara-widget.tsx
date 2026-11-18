"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, BookOpen, LifeBuoy, RotateCcw, X } from "lucide-react";
import { TicketForm } from "../ticket-form";

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: Array<{ id: string; title: string; slug: string }>;
  suggestTicket?: boolean;
}

const STORAGE_KEY = "lumen.tara.v1";
const SUGGESTIONS = ["How does Lumen work?", "Why won't a page summarise?", "Is my data private?", "Talk to a person"];

function TaraAvatar({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={size > 64 ? "/tara/tara-avatar.webp" : "/tara/tara-avatar-128.webp"}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full ring-1 ring-line ${className}`}
      decoding="async"
    />
  );
}

function load(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Msg[]).slice(-30) : [];
  } catch {
    return [];
  }
}

export function TaraWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "ticket">("chat");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMsgs(load()), []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* ignore */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const ask = useCallback(
    async (text: string) => {
      const q = text.trim().slice(0, 600);
      if (!q || busy) return;
      const history = msgs.slice(-8).map((m) => ({ role: m.role, text: m.text.slice(0, 1500) }));
      setMsgs((m) => [...m, { role: "user", text: q }]);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch("/api/tara", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: q, history }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          setMsgs((m) => [
            ...m,
            {
              role: "assistant",
              text: data?.error?.message || "Sorry, I couldn't answer just now. You can try again, or raise a support ticket.",
              suggestTicket: true,
            },
          ]);
        } else {
          setMsgs((m) => [...m, { role: "assistant", text: data.answer, sources: data.sources, suggestTicket: data.suggestTicket }]);
        }
      } catch {
        setMsgs((m) => [...m, { role: "assistant", text: "You seem to be offline. Please check your connection.", suggestTicket: false }]);
      } finally {
        setBusy(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [busy, msgs],
  );

  // Other parts of the app can open Tara with a question.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      setOpen(true);
      setView("chat");
      if (q) setTimeout(() => ask(q), 50);
    };
    window.addEventListener("lumen:open-tara", onOpen);
    return () => window.removeEventListener("lumen:open-tara", onOpen);
  }, [ask]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname?.startsWith("/og-card")) return null;

  const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.text ?? "";

  return (
    <>
      {!open ? (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 text-sm font-medium text-ink shadow-pop transition-transform hover:-translate-y-0.5"
          aria-label="Ask Tara, the Lumen help assistant"
        >
          <TaraAvatar size={34} />
          <span>Ask Tara</span>
        </button>
      ) : null}

      {open ? (
        <section
          role="dialog"
          aria-label="Ask Tara"
          className="animate-rise fixed inset-0 z-50 flex flex-col bg-surface sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100dvh-40px))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-line sm:shadow-pop"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <TaraAvatar size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight text-ink">Tara</p>
              <p className="truncate text-[12px] text-ink-3">Help assistant · answers from the Help Center</p>
            </div>
            {msgs.length && view === "chat" ? (
              <button
                type="button"
                onClick={() => setMsgs([])}
                className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                aria-label="Start a new conversation"
                title="New conversation"
              >
                <RotateCcw className="size-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                requestAnimationFrame(() => launcherRef.current?.focus());
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
              aria-label="Close Ask Tara"
            >
              <X className="size-4" />
            </button>
          </header>

          {view === "ticket" ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-4 text-sm text-ink-2">Tell us what you need and a person will reply by email.</p>
              <TicketForm
                compact
                defaultSubject={lastUser ? lastUser.slice(0, 100) : ""}
                defaultMessage={lastUser}
                transcript={msgs.map((m) => ({ role: m.role, text: m.text }))}
                onCancel={() => setView("chat")}
              />
            </div>
          ) : (
            <>
              <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
                {msgs.length === 0 ? (
                  <div className="flex flex-col items-center pt-4 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/tara/tara-wave.webp" alt="" width={112} height={166} className="h-[150px] w-auto" decoding="async" />
                    <p className="mt-3 text-[15px] font-medium text-ink">Hi, I&apos;m Tara.</p>
                    <p className="mt-1 max-w-[280px] text-sm leading-relaxed text-ink-3">
                      I answer questions about Lumen using the Help Center. I&apos;m an automated assistant.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => ask(s)}
                          className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-2 hover:border-line-strong hover:text-ink"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {msgs.map((m, i) =>
                      m.role === "user" ? (
                        <li key={i} className="flex justify-end">
                          <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[14px] leading-relaxed text-on-primary">
                            {m.text}
                          </p>
                        </li>
                      ) : (
                        <li key={i} className="flex gap-2.5">
                          <TaraAvatar size={26} className="mt-0.5" />
                          <div className="min-w-0 max-w-[88%]">
                            <p className="sr-only">Tara said:</p>
                            <p className="whitespace-pre-wrap rounded-2xl rounded-tl-md bg-surface-2 px-3.5 py-2 text-[14px] leading-relaxed text-ink">
                              {m.text}
                            </p>
                            {m.sources?.length ? (
                              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                                {m.sources.map((s) => (
                                  <li key={s.id}>
                                    <Link
                                      href={`/help/${s.slug}`}
                                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-primary-ink hover:bg-primary-soft"
                                    >
                                      <BookOpen className="size-3" /> {s.title}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {m.suggestTicket ? (
                              <button
                                type="button"
                                onClick={() => setView("ticket")}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-surface-2"
                              >
                                <LifeBuoy className="size-3.5" /> Raise a support ticket
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ),
                    )}
                    {busy ? (
                      <li className="flex gap-2.5" aria-label="Tara is typing">
                        <TaraAvatar size={26} />
                        <span className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md bg-surface-2 px-3.5 py-3">
                          {[0, 1, 2].map((d) => (
                            <span key={d} className="size-1.5 animate-pulse rounded-full bg-ink-3" style={{ animationDelay: `${d * 160}ms` }} />
                          ))}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>

              <form
                className="border-t border-line p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
                  <label htmlFor="tara-input" className="sr-only">
                    Ask Tara a question
                  </label>
                  <textarea
                    id="tara-input"
                    ref={inputRef}
                    rows={1}
                    value={input}
                    maxLength={600}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        ask(input);
                      }
                    }}
                    placeholder="Ask about Lumen…"
                    className="max-h-28 min-h-[24px] flex-1 resize-none bg-transparent py-0.5 text-[14px] leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || busy}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-opacity disabled:opacity-40"
                    aria-label="Send"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-ink-3">
                  <span>Tara can make mistakes.</span>
                  <button type="button" onClick={() => setView("ticket")} className="whitespace-nowrap font-medium text-ink-2 hover:text-ink">
                    Talk to a person
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
