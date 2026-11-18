"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { HELP_ARTICLES, HELP_CATEGORIES, searchHelp, type HelpCategory } from "@/lib/help-center";
import { openTara } from "@/lib/client/format";

export function HelpSearch() {
  const [q, setQ] = useState("");
  const results = useMemo(() => (q.trim().length > 1 ? searchHelp(q, 6) : null), [q]);
  const byCategory = useMemo(() => {
    const map = new Map<HelpCategory, typeof HELP_ARTICLES>();
    for (const a of HELP_ARTICLES) map.set(a.category, [...(map.get(a.category) ?? []), a]);
    return map;
  }, []);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
        <label htmlFor="help-q" className="sr-only">
          Search the Help Center
        </label>
        <input
          id="help-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for help, e.g. “page won't summarise”"
          className="h-13 w-full rounded-2xl border border-line-strong bg-surface pl-12 pr-4 text-[16px] shadow-hair placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          style={{ height: 52 }}
        />
      </div>

      {results ? (
        <section aria-live="polite" className="mt-6">
          <h2 className="sr-only">Search results</h2>
          {results.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {results.map(({ article }) => (
                <li key={article.id}>
                  <Link href={`/help/${article.slug}`} className="block px-5 py-4 hover:bg-bg-subtle">
                    <span className="block font-medium text-ink">{article.title}</span>
                    <span className="mt-0.5 block text-sm text-ink-3">{article.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
              <p className="font-medium text-ink">No articles match “{q}”</p>
              <p className="mt-1 text-sm text-ink-3">
                Try other words,{" "}
                <button type="button" className="link" onClick={() => openTara(q)}>
                  ask Tara
                </button>{" "}
                or{" "}
                <Link className="link" href="/support">
                  contact support
                </Link>
                .
              </p>
            </div>
          )}
        </section>
      ) : (
        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {(Object.keys(HELP_CATEGORIES) as HelpCategory[]).map((cat) => (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="text-[15px] font-semibold text-ink">
                {HELP_CATEGORIES[cat].title}
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-3">{HELP_CATEGORIES[cat].blurb}</p>
              <ul className="mt-3 space-y-2">
                {(byCategory.get(cat) ?? []).map((a) => (
                  <li key={a.id}>
                    <Link href={`/help/${a.slug}`} className="text-[15px] text-primary-ink hover:underline">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
