"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, LogOut, Trash2 } from "lucide-react";
import { useAuth, useToast } from "@/components/providers";
import { Button, Field, PageHeader, Spinner, buttonClass, inputClass } from "@/components/ui";
import { accountsEnabled } from "@/lib/client/supabase-browser";

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(accountsEnabled ? "/sign-in" : "/");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-20 text-sm text-ink-3" role="status">
        <Spinner /> Loading…
      </div>
    );
  }

  const created = new Date(user.created_at).toLocaleDateString("en-IN", { dateStyle: "long" });

  async function remove() {
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      toast(d?.error?.message || "Couldn't delete your account.", "error");
      return;
    }
    await signOut();
    toast("Your account has been deleted");
    router.replace("/");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-12 sm:px-6">
      <PageHeader title="Account" />

      <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="profile-h">
        <h2 id="profile-h" className="text-[15px] font-semibold text-ink">
          Profile
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-ink-3">Name</dt>
          <dd className="text-ink">{(user.user_metadata?.full_name as string) || "Not set"}</dd>
          <dt className="text-ink-3">Email</dt>
          <dd className="text-ink">{user.email}</dd>
          <dt className="text-ink-3">Member since</dt>
          <dd className="text-ink">{created}</dd>
          <dt className="text-ink-3">Terms accepted</dt>
          <dd className="text-ink">
            {user.user_metadata?.terms_version ? `Version ${user.user_metadata.terms_version}` : "Not recorded"} ·{" "}
            <Link href="/legal/terms" className="link">
              Read
            </Link>
          </dd>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href="/api/account" className={buttonClass("secondary", "md")} download>
            <Download className="size-4" /> Download my data
          </a>
          <Button variant="ghost" onClick={() => signOut().then(() => router.replace("/"))}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6" aria-labelledby="danger-h">
        <h2 id="danger-h" className="text-[15px] font-semibold text-ink">
          Delete account
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">
          This permanently deletes your account and saved summaries and withdraws your consent. Support tickets are kept but unlinked
          from your account. This can&apos;t be undone.
        </p>
        <div className="mt-4 max-w-sm">
          <Field label='Type "DELETE" to confirm' htmlFor="confirm-delete">
            <input id="confirm-delete" className={inputClass} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <Button variant="danger" className="mt-4" disabled={confirmText !== "DELETE" || deleting} onClick={remove}>
          {deleting ? <Spinner /> : <Trash2 className="size-4" />} Delete my account
        </Button>
      </section>
    </div>
  );
}
