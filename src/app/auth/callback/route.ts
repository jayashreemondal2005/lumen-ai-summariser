import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAdmin, supabaseForRequest } from "@/lib/server/supabase";
import { clientIp, hashIp } from "@/lib/server/request";
import { LEGAL_VERSIONS } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only allow redirects to paths on this site. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/**
 * Completes email verification, password recovery and OAuth sign-in.
 * Handles both the PKCE `code` flow and the `token_hash` flow.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));
  const origin = url.origin;

  const supabase = await supabaseForRequest();
  if (!supabase) return NextResponse.redirect(`${origin}/sign-in?error=unavailable`);

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }
  if (!ok) return NextResponse.redirect(`${origin}/sign-in?error=link`);

  // Record the Terms acceptance captured at sign-up, now that we have a verified user.
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const admin = supabaseAdmin();
  if (user && admin && user.user_metadata?.terms_version === LEGAL_VERSIONS.terms && !user.user_metadata?.consent_recorded) {
    const { error } = await admin.from("consents").insert({
      user_id: user.id,
      document: "terms",
      version: user.user_metadata.terms_version,
      accepted_at: user.user_metadata.terms_accepted_at ?? new Date().toISOString(),
      ip_hash: hashIp(clientIp(req)),
      user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
    });
    if (!error) {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, consent_recorded: true },
      });
    }
  }

  const dest = type === "recovery" ? "/reset-password" : next === "/" ? "/?welcome=1" : next;
  return NextResponse.redirect(`${origin}${dest}`);
}
