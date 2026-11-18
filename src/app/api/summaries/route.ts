import { apiError, json, sameOrigin } from "@/lib/server/request";
import { currentUser } from "@/lib/server/supabase";
import { rowToResult } from "@/lib/server/summary-rows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lists the signed-in user's saved summaries (RLS restricts rows to the owner). */
export async function GET(req: Request) {
  const session = await currentUser();
  if (!session) return apiError(401, "UNAUTHENTICATED", "Please sign in.");
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const { data, error } = await session.client
    .from("summaries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return apiError(500, "FAILED", "Could not load your history.");
  return json({ items: (data || []).map(rowToResult) });
}

/** Deletes all of the signed-in user's saved summaries. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  const session = await currentUser();
  if (!session) return apiError(401, "UNAUTHENTICATED", "Please sign in.");
  const { error } = await session.client.from("summaries").delete().eq("user_id", session.user.id);
  if (error) return apiError(500, "FAILED", "Could not clear your history.");
  return json({ ok: true });
}
