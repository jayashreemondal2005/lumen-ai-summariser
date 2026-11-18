"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Gauge, Globe2, Languages, Lock, MessageSquareQuote, ShieldCheck, Volume2, Wand2 } from "lucide-react";
import { useGuestHistory, useSummariser } from "@/lib/client/stores";
import { formatDate, hostOf } from "@/lib/client/format";
import { useAuth } from "../providers";
import type { SummaryResult } from "@/lib/schemas";

const FEATURES = [
  { icon: Gauge, title: "Live, honest progress", body: "Watch each real step as the server fetches, cleans and summarises the page." },
  { icon: Languages, title: "16 languages", body: "Get the summary in English, Hindi, Bengali, Tamil and more, whatever the page's language." },
  { icon: MessageSquareQuote, title: "Ask the page", body: "Ask follow-up questions. Answers quote the exact passages they come from." },
  { icon: Wand2, title: "Rewrite in one tap", body: "Make any summary simpler or shorter, or translate it, without re-reading the page." },
  { icon: Volume2, title: "Listen", body: "Have the summary read aloud by your browser. Nothing extra is sent anywhere." },
  { icon: ShieldCheck, title: "Safe by design", body: "Private networks are blocked, page text is treated as data, and every answer is validated." },
];

const STEPS = [
  { n: "01", t: "Paste a link", d: "Any public article, doc, blog post or product page." },
  { n: "02", t: "Lumen reads it", d: "It strips menus and ads and finds the main text." },
  { n: "03", t: "Get the gist", d: "A TL;DR, a clear summary and the key points." },
];

export function RecentStrip() {
  const { user } = useAuth();
  const guest = useGuestHistory((s) => s.items);
  const show = useSummariser((s) => s.show);
  const [items, setItems] = useState<SummaryResult[] | null>(null);

  useEffect(() => {
    if (!user) {
      setItems(guest.slice(0, 3));
      return;
    }
    let cancelled = false;
    fetch("/api/summaries?limit=3")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => !cancelled && setItems((d.items as SummaryResult[]) ?? []))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [user, guest]);

  if (items === null) {
    return (
      <div className="mt-12 grid gap-3 sm:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton mt-3 h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  if (!items.length) return null;

  return (
    <section aria-labelledby="recent-h" className="mt-12">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-h" className="text-sm font-semibold text-ink">
          Pick up where you left off
        </h2>
        <Link href="/history" className="press inline-flex items-center gap-1 text-[13px] font-medium text-primary-ink hover:underline">
          All history <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => {
                show(i);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="press group block h-full w-full rounded-2xl border border-line bg-surface p-4 text-left shadow-hair hover:border-line-strong hover:shadow-card"
            >
              <span className="line-clamp-2 text-[14px] font-medium leading-snug text-ink group-hover:text-primary-ink">{i.title}</span>
              <span className="mt-2 block truncate text-[12px] text-ink-3">
                {i.siteName || hostOf(i.url)} · {formatDate(i.createdAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeSections() {
  return (
    <>
      <RecentStrip />

      <section aria-labelledby="how-h" className="mt-16">
        <h2 id="how-h" className="text-center text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          How it works
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="relative rounded-2xl border border-line bg-surface p-5 shadow-hair">
              <span className="font-mono text-[12px] font-semibold text-primary-ink">{s.n}</span>
              <p className="mt-2 font-medium text-ink">{s.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-3">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features-h" className="mt-20">
        <div className="text-center">
          <h2 id="features-h" className="text-[26px] font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">
            More than a summary
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-[15px] text-ink-2">Everything you need to understand a page quickly, and to trust what you read.</p>
        </div>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="bg-surface p-6">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-ink">
                <f.icon className="size-[18px]" aria-hidden />
              </span>
              <p className="mt-4 font-medium text-ink">{f.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-3">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3" aria-label="Trust">
        {[
          { icon: Lock, t: "Private by default", d: "Guest history never leaves your browser. No ads, no trackers." },
          { icon: Globe2, t: "Works as a guest", d: "No sign-up needed. Create an account to sync history." },
          { icon: ShieldCheck, t: "DPDP-ready", d: "Clear privacy policy, data export and account deletion." },
        ].map((x) => (
          <div key={x.t} className="flex gap-3 rounded-2xl bg-bg-subtle p-5">
            <x.icon className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
            <div>
              <p className="text-sm font-medium text-ink">{x.t}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{x.d}</p>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
