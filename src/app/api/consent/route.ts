import { LEGAL_VERSIONS } from "@/lib/config";
import { ConsentRequestSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/server/rate-limit";
import { apiError, clientIp, hashIp, json, readJson, sameOrigin } from "@/lib/server/request";
import { currentUser, supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  let body: unknown;
  try {
    body = await readJson(req, 2_000);
  } catch {
    return apiError(400, "BAD_REQUEST", "The request could not be read.");
  }
  const parsed = ConsentRequestSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "BAD_REQUEST", "Invalid consent record.");
  if (parsed.data.version !== LEGAL_VERSIONS.terms) {
    return apiError(409, "OUTDATED", "Please review the latest Terms of Service.");
  }

  const ipHash = hashIp(clientIp(req));
  const limit = await rateLimit(`consent:${ipHash}`, 3600, 20);
  if (!limit.allowed) return apiError(429, "RATE_LIMITED", "Too many requests.");

  const session = await currentUser();
  if (!session && !parsed.data.anonId) return apiError(400, "BAD_REQUEST", "Missing identifier.");

  const db = supabaseAdmin();
  if (!db) return json({ ok: true, recorded: false });

  const { error } = await db.from("consents").insert({
    user_id: session?.user.id ?? null,
    anon_id: session ? null : parsed.data.anonId,
    document: "terms",
    version: parsed.data.version,
    ip_hash: ipHash,
    user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
  });
  if (error) {
    console.warn("[consent] insert failed", error.code);
    return apiError(500, "FAILED", "Could not record consent.");
  }

  if (session) {
    await db.auth.admin.updateUserById(session.user.id, {
      user_metadata: {
        ...session.user.user_metadata,
        terms_version: parsed.data.version,
        terms_accepted_at: new Date().toISOString(),
        consent_recorded: true,
      },
    });
  }
  return json({ ok: true, recorded: true });
}
