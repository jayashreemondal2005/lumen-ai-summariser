"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Check } from "lucide-react";
import { terms } from "@/lib/legal";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/config";
import { useConsent } from "@/lib/client/stores";
import { LegalBody } from "./legal-body";
import { Button } from "./ui";

/**
 * Scroll-to-accept Terms of Service dialog. The accept button unlocks only
 * after the reader reaches the end of the document. Acceptance is stored with
 * the document version and recorded server-side (see ConsentSync).
 */
export function TermsGate({ open: forcedOpen, onAccepted, onClose }: { open?: boolean; onAccepted?: () => void; onClose?: () => void } = {}) {
  const gateOpen = useConsent((s) => s.gateOpen);
  const accept = useConsent((s) => s.accept);
  const closeGate = useConsent((s) => s.closeGate);
  const open = forcedOpen ?? gateOpen;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      setReachedEnd(false);
      setChecked(false);
      setProgress(0);
      d.showModal();
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const p = max <= 0 ? 1 : el.scrollTop / max;
    setProgress(p);
    if (p > 0.985) setReachedEnd(true);
  }

  function dismiss() {
    if (forcedOpen !== undefined) onClose?.();
    else closeGate();
  }

  function agree() {
    if (forcedOpen !== undefined) onAccepted?.();
    else accept(terms.version);
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      aria-labelledby="terms-title"
      aria-describedby="terms-desc"
      className="m-auto w-[min(720px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-black/45 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex max-h-[calc(100dvh-24px)] flex-col">
        <div className="border-b border-line px-6 pb-4 pt-5">
          <h2 id="terms-title" className="text-lg font-semibold tracking-[-0.01em]">
            Before you start: Terms of Service
          </h2>
          <p id="terms-desc" className="mt-1 text-sm text-ink-3">
            Version {terms.version} · Effective {LEGAL_EFFECTIVE_DATE}. Please read to the end to continue.
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          tabIndex={0}
          role="document"
          aria-label="Terms of Service text"
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-1 focus:outline-none"
          style={{ maxHeight: "min(56dvh, 520px)" }}
        >
          <p className="prose-legal mt-4 text-[15px]">{terms.summary}</p>
          <LegalBody doc={terms} headingLevel={3} />
          <p className="mt-6 text-sm text-ink-3">
            These Terms include the{" "}
            <Link className="link" href="/legal/privacy" target="_blank">
              Privacy Policy
            </Link>
            ,{" "}
            <Link className="link" href="/legal/cookies" target="_blank">
              Cookie Policy
            </Link>
            ,{" "}
            <Link className="link" href="/legal/ai-disclaimer" target="_blank">
              AI Disclaimer
            </Link>{" "}
            and{" "}
            <Link className="link" href="/legal/acceptable-use" target="_blank">
              Acceptable Use Policy
            </Link>
            .
          </p>
          <p className="mt-3 text-sm font-medium text-ink-2" id="terms-end">
            End of the Terms of Service.
          </p>
        </div>

        <div className="border-t border-line bg-bg-subtle px-6 py-4">
          <label className={`flex items-start gap-3 text-sm ${reachedEnd ? "text-ink" : "text-ink-3"}`}>
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              disabled={!reachedEnd}
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              aria-describedby="terms-hint"
            />
            <span>
              I have read and agree to the Terms of Service, and I&apos;ve read the Privacy Policy. I am 18 or older, or I have a
              parent&apos;s or guardian&apos;s consent.
            </span>
          </label>
          <div className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p id="terms-hint" className="text-[13px] text-ink-3" aria-live="polite">
              {reachedEnd ? (
                <span className="inline-flex items-center gap-1.5 text-accent-ink">
                  <Check className="size-4" /> You&apos;ve reached the end.
                </span>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 hover:text-ink"
                  onClick={() => scrollRef.current?.scrollBy({ top: (scrollRef.current?.clientHeight ?? 400) * 0.9, behavior: "smooth" })}
                >
                  <ArrowDown className="size-4" /> Scroll to the end to continue
                </button>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={dismiss}>
                Not now
              </Button>
              <Button onClick={agree} disabled={!reachedEnd || !checked}>
                I agree and continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
