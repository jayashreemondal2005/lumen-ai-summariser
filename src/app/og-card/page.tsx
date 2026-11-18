import type { Metadata } from "next";
import { LumenMark } from "@/components/logo";

// A 1200x630 card used to render /og.png (see scripts/render-og.mjs).
export const metadata: Metadata = { title: "Lumen", robots: { index: false, follow: false } };

export default function OgCard() {
  return (
    <div
      data-og-card
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "#ffffff" }}
    >
      <div className="relative flex h-[630px] w-[1200px] flex-col justify-between overflow-hidden px-[88px] py-[80px]" style={{ background: "#ffffff", color: "#15181e" }}>
        <div
          aria-hidden
          className="absolute -right-24 -top-24 size-[520px] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(47,91,234,0.10), rgba(18,181,166,0.06) 60%, transparent)" }}
        />
        <div className="flex items-center gap-4">
          <LumenMark className="size-[72px]" />
          <span className="text-[44px] font-semibold tracking-[-0.03em]">Lumen</span>
        </div>
        <div>
          <p className="text-[84px] font-semibold leading-[1.02] tracking-[-0.04em]">Clarity for every page.</p>
          <p className="mt-6 max-w-[860px] text-[30px] leading-snug" style={{ color: "#464d5b" }}>
            Paste a link. Get the summary and the key points in seconds.
          </p>
        </div>
        <div className="flex items-center justify-between text-[22px]" style={{ color: "#646b79" }}>
          <span>AI website summariser · Free to use</span>
          <span>Designed &amp; built by Jayashree Mondal</span>
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[10px]" style={{ background: "linear-gradient(90deg, #2F5BEA, #2489E0 50%, #12B5A6)" }} />
      </div>
    </div>
  );
}
