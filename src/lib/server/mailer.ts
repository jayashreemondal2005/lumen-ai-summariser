import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { APP_NAME, siteUrl } from "../config";
import { mailConfigured, serverEnv } from "./env";
import { customerConfirmationEmail, headerSafe, supportInboxEmail, type TicketEmailData } from "./email-templates";
import { LOGO_PNG_BASE64 } from "./logo-data";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!mailConfigured()) return null;
  if (!transporter) {
    const env = serverEnv();
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

let logoCache: Buffer | null = null;
async function logoPng(): Promise<Buffer | null> {
  if (logoCache) return logoCache;
  // Bundled with the server code, so it works on serverless hosts where
  // /public is served from a CDN and isn't on the function's disk.
  if (LOGO_PNG_BASE64) {
    logoCache = Buffer.from(LOGO_PNG_BASE64, "base64");
    return logoCache;
  }
  try {
    logoCache = await readFile(path.join(process.cwd(), "public", "brand", "lumen-mark-96.png"));
    return logoCache;
  } catch {
    /* fall through */
  }
  try {
    const res = await fetch(`${siteUrl()}/brand/lumen-mark-96.png`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) logoCache = Buffer.from(await res.arrayBuffer());
  } catch {
    /* send without logo */
  }
  return logoCache;
}

export async function sendTicketEmails(
  data: Omit<TicketEmailData, "appUrl" | "logoCid">,
): Promise<{ inbox: boolean; customer: boolean }> {
  const t = getTransporter();
  if (!t) return { inbox: false, customer: false };
  const env = serverEnv();
  const logo = await logoPng();
  const logoCid = "lumen-logo@lumen";
  const full: TicketEmailData = { ...data, appUrl: siteUrl(), logoCid };
  const attachments = logo ? [{ filename: "lumen.png", content: logo, cid: logoCid, contentType: "image/png" }] : [];
  const from = { name: `${APP_NAME} Support`, address: env.SMTP_USER };

  const inboxMail = supportInboxEmail(full);
  const customerMail = customerConfirmationEmail(full);

  const [inbox, customer] = await Promise.allSettled([
    t.sendMail({
      from,
      to: env.SUPPORT_INBOX,
      replyTo: { name: headerSafe(data.name, 80), address: data.email },
      subject: inboxMail.subject,
      html: inboxMail.html,
      text: inboxMail.text,
      attachments,
      headers: { "X-Lumen-Ticket": data.ticketRef },
    }),
    t.sendMail({
      from,
      to: { name: headerSafe(data.name, 80), address: data.email },
      replyTo: env.SUPPORT_INBOX,
      subject: customerMail.subject,
      html: customerMail.html,
      text: customerMail.text,
      attachments,
      headers: { "X-Lumen-Ticket": data.ticketRef, "Auto-Submitted": "auto-replied" },
    }),
  ]);
  if (inbox.status === "rejected") console.warn("[mail] inbox send failed", (inbox.reason as Error)?.message?.slice(0, 120));
  if (customer.status === "rejected") console.warn("[mail] confirmation send failed", (customer.reason as Error)?.message?.slice(0, 120));
  return { inbox: inbox.status === "fulfilled", customer: customer.status === "fulfilled" };
}
