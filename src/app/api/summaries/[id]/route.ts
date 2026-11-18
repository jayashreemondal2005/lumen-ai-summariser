import { z } from "zod";
import { apiError, json, sameOrigin } from "@/lib/server/request";
import { currentUser } from "@/lib/server/supabase";
import { rowToResult } from "@/lib/server/summary-rows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Id = z.string().uuid();

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return apiError(404, "NOT_FOUND", "Summary not found.");
  const session = await currentUser();
  if (!session) return apiError(401, "UNAUTHENTICATED", "Please sign in.");
  const { data, error } = await session.client.from("summaries").select("*").eq("id", id).maybeSingle();
  if (error) return apiError(500, "FAILED", "Could not load the summary.");
  if (!data) return apiError(404, "NOT_FOUND", "Summary not found.");
  return json({ item: rowToResult(data) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return apiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return apiError(404, "NOT_FOUND", "Summary not found.");
  const session = await currentUser();
  if (!session) return apiError(401, "UNAUTHENTICATED", "Please sign in.");
  const { error } = await session.client.from("summaries").delete().eq("id", id);
  if (error) return apiError(500, "FAILED", "Could not delete the summary.");
  return json({ ok: true });
}
