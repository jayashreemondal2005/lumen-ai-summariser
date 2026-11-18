import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/settings-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
      <PageHeader title="Settings" intro="Make Lumen yours: profile, appearance, summary defaults and privacy." />
      <SettingsView />
    </div>
  );
}
