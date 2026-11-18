import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, legalDoc } from "@/lib/legal";
import { LEGAL_EFFECTIVE_DATE, OPERATOR_LOCATION, OPERATOR_NAME } from "@/lib/config";
import { LegalBody } from "@/components/legal-body";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const d = legalDoc((await params).doc);
  return d ? { title: d.title, description: d.summary } : { title: "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const doc = legalDoc((await params).doc);
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Legal documents" className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[13px] font-semibold text-ink">Legal</p>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {LEGAL_DOCS.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/legal/${d.slug}`}
                  aria-current={d.slug === doc.slug ? "page" : undefined}
                  className={`block rounded-lg px-3 py-1.5 text-sm ${
                    d.slug === doc.slug ? "bg-surface-2 font-medium text-ink" : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
          {doc.sections.length > 6 ? (
            <div className="mt-8 hidden lg:block">
              <p className="text-[13px] font-semibold text-ink">On this page</p>
              <ul className="mt-2 space-y-1.5">
                {doc.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${doc.slug}-${s.id}`} className="block text-[13px] leading-snug text-ink-3 hover:text-ink">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </nav>

        <article className="max-w-[720px]">
          <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">{doc.title}</h1>
          <p className="mt-2 text-sm text-ink-3">
            Version {doc.version} · Effective {LEGAL_EFFECTIVE_DATE} · Operated by {OPERATOR_NAME}, {OPERATOR_LOCATION}
          </p>
          <p className="mt-6 rounded-xl border border-line bg-bg-subtle px-4 py-3 text-[15px] leading-relaxed text-ink-2">{doc.summary}</p>
          <LegalBody doc={doc} />
        </article>
      </div>
    </div>
  );
}
