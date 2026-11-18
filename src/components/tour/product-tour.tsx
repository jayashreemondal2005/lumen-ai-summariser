"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { usePrefs, useConsent } from "@/lib/client/stores";
import { Button } from "../ui";

interface Step {
  target?: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { title: "Welcome to Lumen", body: "A 30-second tour of the essentials. You can skip it any time and replay it from Settings." },
  { target: "url", title: "Paste any link", body: "Drop in an article, doc or blog post. Press / from anywhere to jump here." },
  { target: "options", title: "Make it yours", body: "Pick the length, the language (16 to choose from) and a writing style before you summarise." },
  { target: "nav-history", title: "Your history", body: "Every summary is saved: in this browser as a guest, or across devices with an account." },
  { target: "settings", title: "Profile and settings", body: "Choose an avatar, set your defaults, switch themes, export or clear your data." },
  { target: "tara", title: "Meet Tara", body: "Stuck? Tara answers questions from the Help Center and can connect you with a person." },
  { title: "You're all set", body: "After a summary you can ask questions about the page, listen to it, or rewrite it simpler, shorter or in another language." },
];

function visibleTarget(name?: string): HTMLElement | null {
  if (!name) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return els.find((el) => el.offsetParent !== null || el.getClientRects().length > 0) ?? null;
}

export function ProductTour() {
  const tourDone = usePrefs((s) => s.tourDone);
  const setPrefs = usePrefs((s) => s.set);
  const gateOpen = useConsent((s) => s.gateOpen);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const start = useCallback(() => {
    setI(0);
    setOpen(true);
  }, []);

  // First visit (after the store hydrates), ?tour=1, or the "Take the tour" menu item.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("tour") === "1";
    if (forced) {
      window.history.replaceState(null, "", window.location.pathname);
      const t = setTimeout(start, 300);
      return () => clearTimeout(t);
    }
    if (!usePrefs.getState().tourDone) {
      const t = setTimeout(() => {
        if (!usePrefs.getState().tourDone) start();
      }, 900);
      return () => clearTimeout(t);
    }
  }, [start]);

  useEffect(() => {
    const onStart = () => start();
    window.addEventListener("lumen:start-tour", onStart);
    return () => window.removeEventListener("lumen:start-tour", onStart);
  }, [start]);

  const finish = useCallback(() => {
    setOpen(false);
    setPrefs({ tourDone: true });
  }, [setPrefs]);

  const step = STEPS[i]!;

  const measure = useCallback(() => {
    const el = visibleTarget(step.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step.target]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = visibleTarget(step.target);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    }
    measure();
    cardRef.current?.focus();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, i, step.target, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setI((x) => Math.min(STEPS.length - 1, x + 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || gateOpen || tourDone === undefined) return null;

  const pad = 8;
  const last = i === STEPS.length - 1;
  const cardW = Math.min(360, (typeof window !== "undefined" ? window.innerWidth : 400) - 32);
  let cardStyle: React.CSSProperties = { width: cardW, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (rect && typeof window !== "undefined") {
    const below = rect.bottom + 14;
    const fitsBelow = below + 220 < window.innerHeight;
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), window.innerWidth - cardW - 16);
    cardStyle = fitsBelow ? { width: cardW, left, top: below } : { width: cardW, left, top: Math.max(16, rect.top - 14 - 210) };
  }

  return (
    <div className="fixed inset-0 z-[95]" role="presentation">
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl transition-all duration-200"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(10, 12, 16, 0.55)",
          }}
        >
          <span className="tour-spot absolute inset-0 rounded-2xl ring-2 ring-primary/70" />
        </div>
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[rgba(10,12,16,0.55)]" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className="animate-pop fixed rounded-2xl border border-line bg-surface p-5 shadow-pop focus:outline-none"
        style={cardStyle}
      >
        <div className="flex items-start gap-3">
          {i === 0 || last ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={last ? "/tara/tara-point.webp" : "/tara/tara-wave.webp"} alt="" width={56} height={64} className="-mt-1 h-16 w-auto shrink-0" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-primary-ink">
              Step {i + 1} of {STEPS.length}
            </p>
            <h2 id="tour-title" className="mt-0.5 text-[17px] font-semibold text-ink">
              {step.title}
            </h2>
            <p id="tour-body" className="mt-1 text-sm leading-relaxed text-ink-2">
              {step.body}
            </p>
          </div>
          <button type="button" onClick={finish} aria-label="Skip tour" className="press -mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1" aria-hidden>
            {STEPS.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-primary" : "w-1.5 bg-surface-3"}`} />
            ))}
          </div>
          <div className="flex gap-1.5">
            {i === 0 ? (
              <Button size="sm" variant="ghost" onClick={finish}>
                Skip tour
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setI(i - 1)} aria-label="Previous step">
                <ArrowLeft className="size-3.5" /> Back
              </Button>
            )}
            <Button size="sm" onClick={() => (last ? finish() : setI(i + 1))}>
              {last ? "Start summarising" : i === 0 ? "Show me" : "Next"} {last ? null : <ArrowRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
