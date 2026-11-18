"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, MailCheck } from "lucide-react";
import { accountsEnabled, googleAuthEnabled, supabaseBrowser } from "@/lib/client/supabase-browser";
import { AccountsUnavailable, AuthShell, GoogleIcon, authErrorMessage } from "@/components/auth/auth-shell";
import { Button, Field, Spinner, inputClass } from "@/components/ui";
import { TermsGate } from "@/components/terms-gate";
import { useAuth, useToast } from "@/components/providers";
import { useConsent } from "@/lib/client/stores";
import { LEGAL_VERSIONS } from "@/lib/config";

function strength(pw: string): { score: number; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const label = pw.length < 8 ? "Too short" : s <= 2 ? "Fair" : s <= 3 ? "Good" : "Strong";
  return { score: Math.min(4, s), label };
}

export default function SignUpPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (user && !sentTo) router.replace("/");
  }, [user, sentTo, router]);

  if (!accountsEnabled) return <AccountsUnavailable />;

  const pw = strength(password);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (!accepted) return setError("Please read and accept the Terms of Service.");
    const sb = supabaseBrowser();
    if (!sb) return;
    setBusy(true);
    const acceptedAt = new Date().toISOString();
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        data: { full_name: name.trim(), terms_version: LEGAL_VERSIONS.terms, terms_accepted_at: acceptedAt },
      },
    });
    setBusy(false);
    if (error) return setError(authErrorMessage(error.message));
    useConsent.setState({ termsVersion: LEGAL_VERSIONS.terms, acceptedAt });
    if (data.session) {
      toast("Account created", "success");
      router.replace("/");
      return;
    }
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return setError("An account with this email already exists. Try signing in.");
    }
    setSentTo(email.trim());
  }

  async function resend() {
    const sb = supabaseBrowser();
    if (!sb || !sentTo) return;
    const { error } = await sb.auth.resend({
      type: "signup",
      email: sentTo,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    toast(error ? authErrorMessage(error.message) : "Verification email sent again", error ? "error" : "success");
  }

  async function google() {
    if (!accepted) {
      setError("Please read and accept the Terms of Service first.");
      return;
    }
    const sb = supabaseBrowser();
    if (!sb) return;
    useConsent.setState({ termsVersion: LEGAL_VERSIONS.terms, acceptedAt: new Date().toISOString() });
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=/` } });
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email" intro={<>We sent a verification link to <span className="font-medium text-ink">{sentTo}</span>.</>}>
        <div className="flex gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" />
          <p>Open the email and select the link to finish creating your account. It can take a minute to arrive, and may land in spam.</p>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={resend}>
            Resend email
          </Button>
          <Button variant="ghost" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your Lumen account"
      intro="Free, and your history follows you across devices."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="link">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Name" htmlFor="su-name">
          <input id="su-name" autoComplete="name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Email" htmlFor="su-email">
          <input id="su-email" type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="su-password" hint={password ? `Strength: ${pw.label}` : "At least 8 characters."}>
          <div className="relative">
            <input
              id="su-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              className={`${inputClass} pr-11`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="su-password-hint"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:text-ink"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {password ? (
            <div className="mt-1 flex gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i < pw.score ? (pw.score >= 3 ? "bg-accent" : "bg-warning") : "bg-surface-3"}`} />
              ))}
            </div>
          ) : null}
        </Field>

        <div className="rounded-xl border border-line bg-bg-subtle px-4 py-3">
          {accepted ? (
            <p className="flex items-center gap-2 text-sm text-ink">
              <Check className="size-4 text-accent-ink" /> You accepted the Terms of Service (v{LEGAL_VERSIONS.terms}).
            </p>
          ) : (
            <p className="text-sm text-ink-2">
              To create an account, please{" "}
              <button type="button" className="link font-medium" onClick={() => setTermsOpen(true)}>
                read and accept the Terms of Service
              </button>
              . See also our{" "}
              <Link href="/legal/privacy" className="link" target="_blank">
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? <Spinner /> : null} Create account
        </Button>
        {googleAuthEnabled ? (
          <Button variant="secondary" size="lg" className="w-full" onClick={google}>
            <GoogleIcon /> Sign up with Google
          </Button>
        ) : null}
      </form>

      <TermsGate
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccepted={() => {
          setAccepted(true);
          setTermsOpen(false);
          setError(null);
        }}
      />
    </AuthShell>
  );
}
