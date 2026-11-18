"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { accountsEnabled, supabaseBrowser } from "@/lib/client/supabase-browser";
import { AccountsUnavailable, AuthShell, authErrorMessage } from "@/components/auth/auth-shell";
import { Button, Field, Spinner, inputClass } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!accountsEnabled) return <AccountsUnavailable />;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const sb = supabaseBrowser();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) return setError(authErrorMessage(error.message));
    setSent(true);
  }

  return (
    <AuthShell
      title="Reset your password"
      intro={sent ? undefined : "Enter your account email and we'll send you a reset link."}
      footer={
        <Link href="/sign-in" className="link">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="flex gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink" role="status">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" />
          <p>If an account exists for {email.trim()}, a reset link is on its way. It expires after a short time.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Email" htmlFor="fp-email">
            <input id="fp-email" type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error ? (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={busy || !email} className="w-full">
            {busy ? <Spinner /> : null} Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
