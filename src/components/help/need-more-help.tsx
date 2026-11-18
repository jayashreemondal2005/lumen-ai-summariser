"use client";
import Link from "next/link";
import { openTara } from "@/lib/client/format";
import { Button, buttonClass } from "../ui";

export function NeedMoreHelp() {
  return (
    <aside className="mt-14 flex flex-col items-start gap-5 rounded-2xl border border-line bg-bg-subtle p-6 sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tara/tara-point.webp" alt="" width={92} height={101} className="h-[92px] w-auto" decoding="async" loading="lazy" />
      <div className="flex-1">
        <h2 className="text-base font-semibold text-ink">Still need help?</h2>
        <p className="mt-1 text-sm text-ink-2">Ask Tara, our help assistant, or send a request and a person will reply by email.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => openTara()}>
          Ask Tara
        </Button>
        <Link href="/support" className={buttonClass("primary")}>
          Contact support
        </Link>
      </div>
    </aside>
  );
}
