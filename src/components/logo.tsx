import { useId } from "react";

/** The Lumen mark: three bars narrowing into a drop. Hand-drawn SVG. */
export function LumenMark({ className = "size-7", title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="80 80 352 352" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`lg-${id}`} x1="100" y1="90" x2="330" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2F5BEA" />
          <stop offset="0.5" stopColor="#2489E0" />
          <stop offset="1" stopColor="#12B5A6" />
        </linearGradient>
      </defs>
      <g fill={`url(#lg-${id})`}>
        <rect x="86" y="94" width="340" height="52" rx="26" />
        <rect x="125" y="170" width="262" height="42" rx="21" />
        <rect x="183" y="235" width="146" height="42" rx="21" />
        <path d="M256 295C270.5 316.5 301 345.5 301 373A45 45 0 1 1 211 373C211 345.5 241.5 316.5 256 295Z" />
      </g>
    </svg>
  );
}

export function LumenWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LumenMark className="size-[26px]" />
      <span className="text-[19px] font-semibold tracking-[-0.02em] text-ink">Lumen</span>
    </span>
  );
}
