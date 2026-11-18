// Renders the Help Center's tiny markup format. Text is rendered as React
// children (escaped), never as HTML.

export function HelpMarkup({ body }: { body: string }) {
  const blocks = body.trim().split(/\n{2,}/);
  return (
    <div className="prose-help">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^- /.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\d+\. /, "")}</li>
              ))}
            </ol>
          );
        }
        if (lines[0]?.startsWith("## ")) {
          return (
            <div key={i}>
              <h2>{lines[0].slice(3)}</h2>
              {lines.slice(1).length ? <p>{lines.slice(1).join(" ")}</p> : null}
            </div>
          );
        }
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
