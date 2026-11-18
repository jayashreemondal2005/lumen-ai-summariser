import Link from "next/link";
import { LumenMark } from "./logo";

const groups = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Summarise a page" },
      { href: "/history", label: "History" },
      { href: "/help", label: "Help Center" },
      { href: "/support", label: "Contact support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/cookies", label: "Cookie Policy" },
      { href: "/legal/ai-disclaimer", label: "AI Disclaimer" },
      { href: "/legal/acceptable-use", label: "Acceptable Use" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-bg-subtle">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <LumenMark className="size-6" />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">Lumen</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-3">
            Clarity for every page. Summaries are AI-generated and may contain mistakes, so check the original for anything important.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="text-[13px] font-semibold text-ink">{g.title}</h2>
            <ul className="mt-3 space-y-2">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-3 transition-colors hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-24 pt-5 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:pb-5 lg:pr-48">
          <p>© 2026 Lumen. Designed &amp; built by Jayashree Mondal, Kolkata, India.</p>
          <p>MIT licensed · No ads, no trackers</p>
        </div>
      </div>
    </footer>
  );
}
