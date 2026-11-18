// Email templates for support tickets. Every piece of user-supplied text is
// HTML-escaped before it is placed in markup, and header values are stripped
// of line breaks so they cannot inject extra headers.

import { APP_NAME, APP_TAGLINE, OPERATOR_NAME } from "../config";

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Single-line, length-limited text that is safe in an email header. */
export function headerSafe(input: string, max = 120): string {
  return input
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Escapes and keeps line breaks for multi-line user text. */
function multiline(input: string): string {
  return escapeHtml(input).replace(/\r?\n/g, "<br>");
}

export const CATEGORY_LABELS: Record<string, string> = {
  "summary-quality": "Summary quality",
  account: "Account and sign-in",
  bug: "Something isn't working",
  privacy: "Privacy and data",
  feedback: "Feedback or idea",
  other: "Something else",
};

export interface TicketEmailData {
  ticketRef: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  source: "form" | "tara";
  transcript?: Array<{ role: "user" | "assistant"; text: string }>;
  createdAt: Date;
  appUrl: string;
  /** cid: reference for the inline logo image. */
  logoCid: string;
  signedIn: boolean;
}

const COLORS = {
  ink: "#1A1D23",
  muted: "#5B6270",
  line: "#E4E7EC",
  surface: "#F6F7F9",
  cobalt: "#2F5BEA",
  teal: "#0E8C80",
};

function shell(opts: { preheader: string; body: string; appUrl: string; logoCid: string }): string {
  const appUrl = escapeHtml(opts.appUrl);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(APP_NAME)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.surface};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.surface};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 20px 4px;">
        <a href="${appUrl}" style="text-decoration:none;color:${COLORS.ink};">
          <img src="cid:${escapeHtml(opts.logoCid)}" width="28" height="28" alt="" style="vertical-align:middle;border:0;border-radius:6px;">
          <span style="font:600 18px/28px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;vertical-align:middle;margin-left:8px;color:${COLORS.ink};">${escapeHtml(APP_NAME)}</span>
        </a>
      </td></tr>
      <tr><td style="background:#FFFFFF;border:1px solid ${COLORS.line};border-radius:12px;padding:32px 28px;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${COLORS.ink};">
        ${opts.body}
      </td></tr>
      <tr><td style="padding:20px 4px 0 4px;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${COLORS.muted};">
        ${escapeHtml(APP_NAME)} &middot; ${escapeHtml(APP_TAGLINE)}<br>
        <a href="${appUrl}" style="color:${COLORS.muted};">${appUrl.replace(/^https?:\/\//, "")}</a> &middot;
        <a href="${appUrl}/legal/privacy" style="color:${COLORS.muted};">Privacy</a> &middot;
        <a href="${appUrl}/help" style="color:${COLORS.muted};">Help Center</a><br>
        Designed &amp; built by ${escapeHtml(OPERATOR_NAME)}, Kolkata, India.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function detailRows(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.line};border-radius:8px;margin:20px 0;">
${rows
  .map(
    ([k, v], i) => `<tr><td style="padding:10px 14px;${i ? `border-top:1px solid ${COLORS.line};` : ""}color:${COLORS.muted};font-size:13px;width:120px;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:10px 14px;${i ? `border-top:1px solid ${COLORS.line};` : ""}font-size:14px;vertical-align:top;">${v}</td></tr>`,
  )
  .join("\n")}
</table>`;
}

/** Confirmation sent to the person who raised the ticket. */
export function customerConfirmationEmail(d: TicketEmailData): { subject: string; html: string; text: string } {
  const first = headerSafe(d.name, 80).split(" ")[0] || "there";
  const subject = headerSafe(`[${d.ticketRef}] We've received your request`, 140);
  const date = d.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const body = `
<p style="margin:0 0 16px 0;font-size:20px;font-weight:600;line-height:1.3;">Thanks, ${escapeHtml(first)}. We've got your request.</p>
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(first)},</p>
<p style="margin:0 0 12px 0;">Your support request has reached the ${escapeHtml(APP_NAME)} team. A person will read it and reply to this email address, usually within 2 working days.</p>
${detailRows([
  ["Ticket ID", `<strong style="font-family:Consolas,Menlo,monospace;letter-spacing:.5px;">${escapeHtml(d.ticketRef)}</strong>`],
  ["Subject", escapeHtml(d.subject)],
  ["Topic", escapeHtml(CATEGORY_LABELS[d.category] || "Other")],
  ["Received", `${escapeHtml(date)} IST`],
])}
<p style="margin:0 0 8px 0;color:${COLORS.muted};font-size:13px;">Your message</p>
<div style="background:${COLORS.surface};border-radius:8px;padding:14px 16px;font-size:14px;white-space:normal;word-break:break-word;">${multiline(d.message)}</div>
<p style="margin:20px 0 0 0;">If you need to add anything, just reply to this email and keep the ticket ID in the subject.</p>
<p style="margin:24px 0 0 0;">
  <a href="${escapeHtml(d.appUrl)}" style="display:inline-block;background:${COLORS.cobalt};color:#FFFFFF;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;">Open ${escapeHtml(APP_NAME)}</a>
  <a href="${escapeHtml(d.appUrl)}/help" style="display:inline-block;margin-left:12px;color:${COLORS.cobalt};text-decoration:none;font-weight:600;padding:10px 4px;">Visit the Help Center</a>
</p>
<p style="margin:28px 0 0 0;">Warm regards,<br>The ${escapeHtml(APP_NAME)} team</p>
<p style="margin:20px 0 0 0;color:${COLORS.muted};font-size:12px;">You're receiving this because a support request was submitted with this email address on ${escapeHtml(APP_NAME)}. If that wasn't you, you can ignore this message.</p>`;

  const text = [
    `Hello ${first},`,
    "",
    `Your support request has reached the ${APP_NAME} team. A person will reply to this email address, usually within 2 working days.`,
    "",
    `Ticket ID: ${d.ticketRef}`,
    `Subject: ${headerSafe(d.subject)}`,
    `Topic: ${CATEGORY_LABELS[d.category] || "Other"}`,
    `Received: ${date} IST`,
    "",
    "Your message:",
    d.message,
    "",
    `Open ${APP_NAME}: ${d.appUrl}`,
    `Help Center: ${d.appUrl}/help`,
    "",
    `Warm regards,`,
    `The ${APP_NAME} team`,
  ].join("\n");

  return {
    subject,
    html: shell({ preheader: `Ticket ${d.ticketRef}: we'll reply within 2 working days.`, body, appUrl: d.appUrl, logoCid: d.logoCid }),
    text,
  };
}

/** Notification sent to the support inbox. */
export function supportInboxEmail(d: TicketEmailData): { subject: string; html: string; text: string } {
  const subject = headerSafe(`[${d.ticketRef}] ${CATEGORY_LABELS[d.category] || "Support"}: ${d.subject}`, 160);
  const date = d.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const transcript =
    d.transcript && d.transcript.length
      ? `<p style="margin:20px 0 8px 0;color:${COLORS.muted};font-size:13px;">Ask Tara conversation before escalation</p>
<div style="background:${COLORS.surface};border-radius:8px;padding:12px 16px;font-size:13px;">${d.transcript
          .map((t) => `<p style="margin:6px 0;"><strong>${t.role === "user" ? "User" : "Tara"}:</strong> ${multiline(t.text)}</p>`)
          .join("")}</div>`
      : "";
  const body = `
<p style="margin:0 0 16px 0;font-size:18px;font-weight:600;">New support ticket ${escapeHtml(d.ticketRef)}</p>
${detailRows([
  ["From", `${escapeHtml(d.name)} &lt;${escapeHtml(d.email)}&gt;`],
  ["Account", d.signedIn ? "Signed-in user" : "Guest"],
  ["Topic", escapeHtml(CATEGORY_LABELS[d.category] || "Other")],
  ["Subject", escapeHtml(d.subject)],
  ["Channel", d.source === "tara" ? "Escalated from Ask Tara" : "Support form"],
  ["Received", `${escapeHtml(date)} IST`],
])}
<p style="margin:0 0 8px 0;color:${COLORS.muted};font-size:13px;">Message</p>
<div style="background:${COLORS.surface};border-radius:8px;padding:14px 16px;font-size:14px;word-break:break-word;">${multiline(d.message)}</div>
${transcript}
<p style="margin:20px 0 0 0;color:${COLORS.muted};font-size:13px;">Reply to this email to answer the user directly (Reply-To is set to their address).</p>`;

  const text = [
    `New support ticket ${d.ticketRef}`,
    `From: ${headerSafe(d.name)} <${d.email}>`,
    `Account: ${d.signedIn ? "Signed-in user" : "Guest"}`,
    `Topic: ${CATEGORY_LABELS[d.category] || "Other"}`,
    `Subject: ${headerSafe(d.subject)}`,
    `Channel: ${d.source === "tara" ? "Ask Tara" : "Support form"}`,
    `Received: ${date} IST`,
    "",
    d.message,
  ].join("\n");

  return {
    subject,
    html: shell({ preheader: `${d.name}: ${d.subject}`, body, appUrl: d.appUrl, logoCid: d.logoCid }),
    text,
  };
}
