import type { Metadata } from "next";
import Link from "next/link";
import { TicketForm } from "@/components/ticket-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact support",
  description: "Send a request to the Lumen team. You'll get a ticket ID by email straight away.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
        <div>
          <PageHeader
            title="Contact support"
            intro="Tell us what's going on. You'll get a confirmation email with a ticket ID, and a person will reply, usually within 2 working days."
          />
          <TicketForm />
        </div>
        <aside className="space-y-6 lg:pt-28">
          <div className="rounded-2xl border border-line bg-bg-subtle p-5">
            <h2 className="text-sm font-semibold text-ink">Quick answers</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="link" href="/help/why-a-page-wont-summarise">
                  Why a page won&apos;t summarise
                </Link>
              </li>
              <li>
                <Link className="link" href="/help/reset-your-password">
                  Reset your password
                </Link>
              </li>
              <li>
                <Link className="link" href="/help/what-data-lumen-stores">
                  What data Lumen stores
                </Link>
              </li>
              <li>
                <Link className="link" href="/help/ticket-ids">
                  Ticket IDs and confirmation emails
                </Link>
              </li>
            </ul>
          </div>
          <p className="text-[13px] leading-relaxed text-ink-3">
            Privacy requests and grievances under the DPDP Act: choose the topic “Privacy and data”. See the{" "}
            <Link className="link" href="/legal/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
