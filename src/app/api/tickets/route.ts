import { createHash } from "node:crypto";
import { LIMITS } from "@/lib/config";
import { TicketRequestSchema } from "@/lib/schemas";
import { generateTicketRef, spamCheck } from "@/lib/server/tickets";
import { sendTicketEmails } from "@/lib/server/mailer";
import { rateLimitAll } from "@/lib/server/rate-limit";
import { apiError, clientIp, hashIp, json, readJson, sameOrigin } from "@/lib/server/request";
import { currentUser, supabaseAdmin } from "@/lib/server/supabase";
import { mailConfigured } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  let body: unknown;
  try {
    body = await readJson(req, 40_000);
  } catch {
    return apiError(400, "BAD_REQUEST", "The request could not be read.");
  }
  const parsed = TicketRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return apiError(400, "VALIDATION", issue?.message || "Please check the form.", { field: issue?.path?.[0] });
  }
  const t = parsed.data;

  const ipHash = hashIp(clientIp(req));
  const emailHash = createHash("sha256").update(t.email).digest("hex").slice(0, 32);
  const limit = await rateLimitAll([
    { key: `tix:h:${ipHash}`, windowSec: 3600, max: LIMITS.ticketsPerHour },
    { key: `tix:d:${emailHash}`, windowSec: 86_400, max: LIMITS.ticketsPerDayPerEmail },
  ]);
  if (!limit.allowed) {
    return apiError(
      429,
      "RATE_LIMITED",
      "You've sent several requests recently. Please wait a while before sending another, or reply to your earlier confirmation email.",
      { retryAfter: limit.retryAfterSec },
    );
  }

  const verdict = spamCheck(t);
  if (verdict.spam) {
    // Look successful to bots, but don't store or send anything.
    console.warn("[tickets] dropped as spam:", verdict.reason);
    return json({ ok: true, ticketRef: generateTicketRef(), emailed: false }, { status: 201 });
  }

  if (!mailConfigured() && !supabaseAdmin()) {
    return apiError(503, "UNAVAILABLE", "Support requests can't be sent right now. Please try again later.");
  }

  const session = await currentUser();
  const ticketRef = generateTicketRef();
  const createdAt = new Date();
  const source = t.transcript?.length ? "tara" : "form";

  const db = supabaseAdmin();
  let stored = false;
  if (db) {
    const { error } = await db.from("tickets").insert({
      ticket_ref: ticketRef,
      user_id: session?.user.id ?? null,
      name: t.name,
      email: t.email,
      category: t.category,
      subject: t.subject,
      message: t.message,
      source,
      transcript: t.transcript ?? null,
      ip_hash: ipHash,
    });
    stored = !error;
    if (error) console.warn("[tickets] insert failed", error.code);
  }

  const mail = await sendTicketEmails({
    ticketRef,
    name: t.name,
    email: t.email,
    category: t.category,
    subject: t.subject,
    message: t.message,
    source,
    transcript: t.transcript,
    createdAt,
    signedIn: Boolean(session),
  });

  if (!stored && !mail.inbox) {
    return apiError(502, "SEND_FAILED", "We couldn't send your request just now. Please try again in a few minutes.");
  }
  if (db && stored && (mail.inbox || mail.customer)) {
    await db.from("tickets").update({ email_sent: true }).eq("ticket_ref", ticketRef);
  }

  return json({ ok: true, ticketRef, emailed: mail.customer }, { status: 201 });
}
