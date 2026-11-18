"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, MailCheck } from "lucide-react";
import { TICKET_CATEGORIES } from "@/lib/schemas";
import { useAuth } from "./providers";
import { Button, Field, Spinner, inputClass, textareaClass } from "./ui";

const CATEGORY_LABELS: Record<(typeof TICKET_CATEGORIES)[number], string> = {
  "summary-quality": "Summary quality",
  account: "Account and sign-in",
  bug: "Something isn't working",
  privacy: "Privacy and data",
  feedback: "Feedback or idea",
  other: "Something else",
};

export interface TicketFormProps {
  compact?: boolean;
  defaultSubject?: string;
  defaultMessage?: string;
  defaultCategory?: (typeof TICKET_CATEGORIES)[number];
  transcript?: Array<{ role: "user" | "assistant"; text: string }>;
  onDone?: (ticketRef: string) => void;
  onCancel?: () => void;
}

type Errors = Partial<Record<"name" | "email" | "subject" | "message" | "form", string>>;

export function TicketForm({ compact, defaultSubject = "", defaultMessage = "", defaultCategory = "other", transcript, onDone, onCancel }: TicketFormProps) {
  const id = useId();
  const { user } = useAuth();
  const openedAt = useRef(Date.now());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<(typeof TICKET_CATEGORIES)[number]>(defaultCategory);
  const [subject, setSubject] = useState(defaultSubject.slice(0, 120));
  const [message, setMessage] = useState(defaultMessage.slice(0, 4000));
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ ref: string; email: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail((e) => e || user.email || "");
      setName((n) => n || (user.user_metadata?.full_name as string) || "");
    }
  }, [user]);

  function validate(): Errors {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = "Please enter a valid email address.";
    if (subject.trim().length < 4) e.subject = "Please add a short subject.";
    if (message.trim().length < 20) e.message = "Please describe the issue in at least 20 characters.";
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = (["name", "email", "subject", "message"] as const).find((k) => e[k]);
      if (first) document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          category,
          subject,
          message,
          transcript: transcript?.slice(-12).map((t) => ({ role: t.role, text: t.text.slice(0, 1200) })),
          website,
          elapsedMs: Date.now() - openedAt.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const field = data?.error?.field as keyof Errors | undefined;
        setErrors(field && field !== "form" ? { [field]: data.error.message } : { form: data?.error?.message || "We couldn't send your request. Please try again." });
        return;
      }
      setDone({ ref: data.ticketRef, email: email.trim(), emailed: Boolean(data.emailed) });
      onDone?.(data.ticketRef);
    } catch {
      setErrors({ form: "You seem to be offline. Please check your connection and try again." });
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className={`animate-rise ${compact ? "" : "rounded-2xl border border-line bg-surface p-6 shadow-hair sm:p-8"}`} role="status">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent-ink" aria-hidden>
          <MailCheck className="size-5" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-ink">Request received</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
          {done.emailed ? (
            <>
              We&apos;ve emailed a confirmation to <span className="font-medium text-ink">{done.email}</span>.{" "}
            </>
          ) : null}
          A person will reply by email, usually within 2 working days.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-bg-subtle px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-ink-3">Your ticket ID</p>
            <p className="font-mono text-[15px] font-semibold tracking-wide text-ink">{done.ref}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(done.ref);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              } catch {
                /* ignore */
              }
            }}
            aria-label="Copy ticket ID"
          >
            {copied ? <Check className="size-4 text-accent-ink" /> : <Copy className="size-4" />}
          </Button>
        </div>
        {!done.emailed ? (
          <p className="mt-3 text-[13px] text-ink-3">Keep this ID. If no confirmation email arrives, check your spam folder.</p>
        ) : null}
      </div>
    );
  }

  const gap = compact ? "gap-3.5" : "gap-5";
  return (
    <form onSubmit={submit} noValidate className={`flex flex-col ${gap}`} aria-describedby={errors.form ? `${id}-form-err` : undefined}>
      {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div className={`grid ${gap} ${compact ? "" : "sm:grid-cols-2"}`}>
        <Field label="Your name" htmlFor={`${id}-name`} error={errors.name}>
          <input
            id={`${id}-name`}
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={80}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
          />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`} error={errors.email} hint={compact ? undefined : "We'll send your ticket ID here."}>
          <input
            id={`${id}-email`}
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${id}-email-error` : `${id}-email-hint`}
          />
        </Field>
      </div>

      <Field label="Topic" htmlFor={`${id}-category`}>
        <select id={`${id}-category`} className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Subject" htmlFor={`${id}-subject`} error={errors.subject}>
        <input
          id={`${id}-subject`}
          className={inputClass}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? `${id}-subject-error` : undefined}
        />
      </Field>

      <Field
        label="How can we help?"
        htmlFor={`${id}-message`}
        error={errors.message}
        hint={`Include the page link if it's about a summary. Please don't share passwords. ${message.length}/4000`}
      >
        <textarea
          id={`${id}-message`}
          className={textareaClass}
          rows={compact ? 4 : 6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? `${id}-message-error` : `${id}-message-hint`}
        />
      </Field>

      {errors.form ? (
        <p id={`${id}-form-err`} role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.form}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-relaxed text-ink-3">
          By sending, you agree that we process your message as described in our{" "}
          <Link href="/legal/privacy" className="link">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex gap-2">
          {onCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              Back
            </Button>
          ) : null}
          <Button type="submit" disabled={sending}>
            {sending ? <Spinner /> : null} {sending ? "Sending…" : "Send request"}
          </Button>
        </div>
      </div>
    </form>
  );
}
