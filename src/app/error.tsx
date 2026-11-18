"use client";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-24 text-center">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">Something went wrong</h1>
      <p className="mt-2 text-[15px] text-ink-2">Sorry about that. Please try again, and contact support if it keeps happening.</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/support" className={buttonClass("secondary")}>
          Contact support
        </Link>
      </div>
    </div>
  );
}
