import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HELP_ARTICLES, HELP_CATEGORIES, helpArticle } from "@/lib/help-center";
import { HelpMarkup } from "@/components/help-markup";
import { NeedMoreHelp } from "@/components/help/need-more-help";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = helpArticle((await params).slug);
  return a ? { title: a.title, description: a.summary } : { title: "Help Center" };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = helpArticle((await params).slug);
  if (!article) notFound();
  const related = HELP_ARTICLES.filter((a) => a.category === article.category && a.id !== article.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Link href="/help" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" /> Help Center
      </Link>
      <article>
        <p className="text-[13px] font-medium text-primary-ink">{HELP_CATEGORIES[article.category].title}</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">{article.title}</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{article.summary}</p>
        <div className="mt-8 border-t border-line pt-8 text-[16px]">
          <HelpMarkup body={article.body} />
        </div>
      </article>

      {related.length ? (
        <section aria-labelledby="related-h" className="mt-12">
          <h2 id="related-h" className="text-sm font-semibold text-ink">
            Related articles
          </h2>
          <ul className="mt-3 space-y-2">
            {related.map((a) => (
              <li key={a.id}>
                <Link href={`/help/${a.slug}`} className="text-[15px] text-primary-ink hover:underline">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <NeedMoreHelp />
    </div>
  );
}
