import type { Metadata } from "next";
import { HelpSearch } from "@/components/help/help-search";
import { NeedMoreHelp } from "@/components/help/need-more-help";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Answers to common questions about Lumen: summaries, accounts, privacy and support.",
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <PageHeader title="Help Center" intro="Find answers about summaries, your account, privacy and more." />
      <HelpSearch />
      <NeedMoreHelp />
    </div>
  );
}
