"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cloud, HardDrive, Search, Trash2 } from "lucide-react";
import type { SummaryResult } from "@/lib/schemas";
import { useGuestHistory, useSummariser } from "@/lib/client/stores";
import { formatDate, hostOf } from "@/lib/client/format";
import { accountsEnabled } from "@/lib/client/supabase-browser";
import { useAuth, useToast } from "../providers";
import { Button, ButtonLink, Spinner } from "../ui";

export function HistoryList() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const guest = useGuestHistory();
  const show = useSummariser((s) => s.show);
  const [hydrated, setHydrated] = useState(false);
  const [remote, setRemote] = useState<SummaryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!user) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    fetch("/api/summaries")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error?.message || "Could not load your history.");
        return r.json();
      })
      .then((d) => !cancelled && setRemote(d.items as SummaryResult[]))
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const items = user ? remote : guest.items;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!items || !term) return items ?? [];
    return items.filter((i) => `${i.title} ${i.siteName} ${i.url} ${i.topics.join(" ")}`.toLowerCase().includes(term));
  }, [items, q]);

  async function remove(item: SummaryResult) {
    if (user) {
      const prev = remote;
      setRemote((r) => r?.filter((x) => x.id !== item.id) ?? null);
      const res = await fetch(`/api/summaries/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        setRemote(prev);
        toast("Couldn't delete that summary.", "error");
        return;
      }
    } else {
      guest.remove(item.id);
    }
    toast("Summary deleted");
  }

  async function clearAll() {
    if (!window.confirm(user ? "Delete all saved summaries from your account? This can't be undone." : "Clear all summaries saved in this browser?")) return;
    if (user) {
      const res = await fetch("/api/summaries", { method: "DELETE" });
      if (!res.ok) return toast("Couldn't clear your history.", "error");
      setRemote([]);
    } else guest.clear();
    toast("History cleared");
  }

  function open(item: SummaryResult) {
    if (user) router.push(`/history/${item.id}`);
    else {
      show(item);
      router.push(`/history/${item.id}`);
    }
  }

  const loading = !hydrated || authLoading || (user && remote === null && !error);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[13px] text-ink-3">
          {user ? <Cloud className="size-4" /> : <HardDrive className="size-4" />}
          {user ? "Saved to your account" : "Saved in this browser only"}
          {!user && accountsEnabled ? (
            <>
              {" · "}
              <Link href="/sign-up" className="link">
                Create an account
              </Link>{" "}
              to keep it everywhere
            </>
          ) : null}
        </div>
        {items && items.length ? (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Trash2 className="size-3.5" /> Clear all
          </Button>
        ) : null}
      </div>

      {items && items.length > 3 ? (
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <label htmlFor="history-search" className="sr-only">
            Search history
          </label>
          <input
            id="history-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, site or topic"
            className="h-11 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-3 text-[15px] placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-ink-3" role="status">
          <Spinner /> Loading your history…
        </div>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : !items || items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-base font-medium text-ink">No summaries yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-3">Summaries you create will appear here so you can come back to them.</p>
          <ButtonLink href="/" className="mt-5">
            Summarise a page
          </ButtonLink>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-3">No summaries match “{q}”.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {filtered.map((item) => (
            <li key={item.id} className="group relative flex items-start gap-4 px-5 py-4 transition-colors hover:bg-bg-subtle">
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => open(item)} className="text-left after:absolute after:inset-0 focus:outline-none">
                  <span className="line-clamp-1 text-[15px] font-medium text-ink group-hover:text-primary-ink">{item.title}</span>
                </button>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {item.siteName || hostOf(item.url)} · {formatDate(item.createdAt)} · {item.readingMinutes} min read
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-2">{item.tldr}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(item)}
                className="relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 opacity-100 hover:bg-surface-2 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                aria-label={`Delete summary: ${item.title}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
