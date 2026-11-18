import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-20 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tara/tara-think.webp" alt="" width={120} height={206} className="h-[170px] w-auto" />
      <p className="mt-6 text-[13px] font-semibold text-primary-ink">404</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-ink">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-[15px] text-ink-2">The link may be broken, or the page may have moved.</p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className={buttonClass("primary")}>
          Go to Lumen
        </Link>
        <Link href="/help" className={buttonClass("secondary")}>
          Help Center
        </Link>
      </div>
    </div>
  );
}
