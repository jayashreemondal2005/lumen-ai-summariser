import { aiConfigured } from "@/lib/server/ai";
import { mailConfigured, supabaseAdminConfigured, supabaseConfigured } from "@/lib/server/env";
import { json } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports which integrations are configured. Never returns secret values. */
export async function GET() {
  return json({
    ok: true,
    ai: aiConfigured(),
    accounts: supabaseConfigured(),
    database: supabaseAdminConfigured(),
    email: mailConfigured(),
    time: new Date().toISOString(),
  });
}
