"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { accountsEnabled, googleAuthEnabled, supabaseBrowser } from "@/lib/client/supabase-browser";
import { AccountsUnavailable, AuthShell, GoogleIcon, authErrorMessage } from "@/components/auth/auth-shell";
import { Button, Field, Spinner, inputClass } from "@/components/ui";
import { useAuth, useToast } from "@/components/providers";

function SignInForm() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e === "link") setError("That link has expired or was already used. Sign in, or request a new link.");
  }, []);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const sb = supabaseBrowser();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setNeedsVerify(/not confirmed/i.test(error.message));
      setError(authErrorMessage(error.message));
      return;
    }
    toast("Signed in", "success");
    router.replace("/");
    router.refresh();
  }

  async function resend() {
    const sb = supabaseBrowser();
    if (!sb || !email) return;
    const { error } = await sb.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    toast(error ? authErrorMessage(error.message) : "Verification email sent", error ? "error" : "success");
  }

  async function google() {
    const sb = supabaseBrowser();
    if (!sb) return;
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=/` } });
  }

  return (
    <AuthShell
      title="Sign in to Lumen"
      intro="Keep your summaries in sync across devices."
      footer={
        <>
          New to Lumen?{" "}
          <Link href="/sign-up" className="link">
            Create an account
          </Link>{" "}
          · or keep using it as a guest
        </>
      }
    >
      {googleAuthEnabled ? (
        <>
          <Button variant="secondary" className="w-full" size="lg" onClick={google}>
            <GoogleIcon /> Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-[12px] text-ink-3">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : null}
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor="si-email">
          <input id="si-email" type="email" autoComplete="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="si-password">
          <div className="relative">
            <input
              id="si-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              className={`${inputClass} pr-11`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        </Field>
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-[13px] font-medium text-primary-ink hover:underline">
            Forgot password?
          </Link>
        </div>
        {error ? (
          <div role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
            {needsVerify ? (
              <button type="button" onClick={resend} className="ml-1 font-semibold underline">
                Resend link
              </button>
            ) : null}
          </div>
        ) : null}
        <Button type="submit" size="lg" disabled={busy || !email || !password} className="w-full">
          {busy ? <Spinner /> : null} Sign in
        </Button>
      </form>
    </AuthShell>
  );
}

export default function SignInPage() {
  if (!accountsEnabled) return <AccountsUnavailable />;
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
