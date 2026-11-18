import { apiError, json, sameOrigin } from "@/lib/server/request";
import { currentUser, supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Data export (DPDP right to access): everything we hold for this account. */
export async function GET() {
  const session = await currentUser();
  if (!session) return apiError(401, "UNAUTHENTICATED", "Please sign in.");
  const { user, client } = session;
  const [summaries, tickets, consents] = await Promise.all([
    client.from("summaries").select("*").order("created_at", { ascending: false }),
    client.from("tickets").select("ticket_ref,category,subject,message,source,status,created_at").order("created_at", { ascending: false }),
    client.from("consents").select("document,version,accepted_at,user_agent").order("accepted_at", { ascending: false }),
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    service: "Lumen",
    account: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      termsVersion: user.user_metadata?.terms_version ?? null,
    },
    summaries: summaries.data ?? [],
    tickets: tickets.data ?? [],
    consents: consents.data ?? [],
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lumen-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Account deletion (DPDP right to erasure / withdraw consent). */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  const session = await currentUser();
  if (!session) return apiError(401, "UNAUTHENTICATED", "Please sign in.");
  const admin = supabaseAdmin();
  if (!admin) return apiError(503, "UNAVAILABLE", "Account deletion is temporarily unavailable. Please contact support.");
  // Summaries and consents cascade; tickets are kept but unlinked (on delete set null).
  const { error } = await admin.auth.admin.deleteUser(session.user.id);
  if (error) return apiError(500, "FAILED", "We couldn't delete your account. Please try again or contact support.");
  await session.client.auth.signOut().catch(() => {});
  return json({ ok: true });
}
