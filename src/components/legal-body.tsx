import type { Block, LegalDocument } from "@/lib/legal";

function renderBlock(b: Block, i: number) {
  if (typeof b === "string") return <p key={i}>{b}</p>;
  if ("list" in b)
    return (
      <ul key={i}>
        {b.list.map((li, j) => (
          <li key={j}>{li}</li>
        ))}
      </ul>
    );
  return <h3 key={i}>{b.h3}</h3>;
}

export function LegalBody({ doc, headingLevel = 2 }: { doc: LegalDocument; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="prose-legal">
      {doc.sections.map((s) => (
        <section key={s.id} aria-labelledby={`${doc.slug}-${s.id}`}>
          <H id={`${doc.slug}-${s.id}`}>{s.title}</H>
          {s.body.map(renderBlock)}
        </section>
      ))}
    </div>
  );
}
