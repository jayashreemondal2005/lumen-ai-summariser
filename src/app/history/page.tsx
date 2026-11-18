import type { Metadata } from "next";
import { HistoryList } from "@/components/history/history-list";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "History", robots: { index: false } };

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <PageHeader title="History" intro="Every page you've summarised, newest first." />
      <HistoryList />
    </div>
  );
}
