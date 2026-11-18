"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { accountsEnabled, supabaseBrowser } from "@/lib/client/supabase-browser";
import { AccountsUnavailable, AuthShell, authErrorMessage } from "@/components/auth/auth-shell";
import { Button, Field, Spinner, inputClass } from "@/components/ui";
import { useAuth, useToast } from "@/components/providers";

export default function ResetPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!accountsEnabled) return <AccountsUnavailable />;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    const sb = supabaseBrowser();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(authErrorMessage(error.message));
    toast("Password updated", "success");
    router.replace("/");
  }

  if (!loading && !user) {
    return (
      <AuthShell title="Link expired" intro="Open the latest reset link from your email, or request a new one.">
        <Link href="/forgot-password" className="link text-sm">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="New password" htmlFor="rp-1" hint="At least 8 characters.">
          <input id="rp-1" type="password" autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="rp-2">
          <input id="rp-2" type="password" autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? <Spinner /> : null} Update password
        </Button>
      </form>
    </AuthShell>
  );
}
