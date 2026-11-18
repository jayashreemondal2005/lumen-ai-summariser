"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { SummaryResult } from "@/lib/schemas";
import { useGuestHistory } from "@/lib/client/stores";
import { useAuth } from "@/components/providers";
import { SummaryView } from "@/components/summary/summary-view";
import { ButtonLink } from "@/components/ui";

export default function HistoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const guestItems = useGuestHistory((s) => s.items);
  const [item, setItem] = useState<SummaryResult | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;
    const local = guestItems.find((i) => i.id === id);
    if (local) return setItem(local);
    if (!user) return setItem(null);
    fetch(`/api/summaries/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setItem(d?.item ?? null))
      .catch(() => setItem(null));
  }, [id, user, loading, guestItems]);

  useEffect(() => {
    if (item) document.title = `${item.title} · Lumen`;
  }, [item]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Link href="/history" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" /> History
      </Link>
      {item === undefined ? (
        <div className="rounded-2xl border border-line bg-surface p-7" aria-busy="true" aria-label="Loading summary">
          <div className="skeleton h-7 w-3/4" />
          <div className="skeleton mt-5 h-16 w-full rounded-xl" />
          <div className="mt-6 space-y-2.5">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-11/12" />
            <div className="skeleton h-4 w-4/5" />
          </div>
        </div>
      ) : item === null ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-base font-medium text-ink">Summary not found</p>
          <p className="mt-1 text-sm text-ink-3">It may have been deleted, or it was saved in a different browser.</p>
          <ButtonLink href="/history" variant="secondary" className="mt-5">
            Back to history
          </ButtonLink>
        </div>
      ) : (
        <SummaryView result={item} savedLabel={item.saved ? "Saved to your account" : "Saved in this browser"} />
      )}
    </div>
  );
}
