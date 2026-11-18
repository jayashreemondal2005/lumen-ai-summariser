import { randomInt } from "node:crypto";

// Crockford base32 without easily-confused characters.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/** e.g. LUM-261118-7K4Q. Date is in IST so it matches what the user sees. */
export function generateTicketRef(now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const yy = String(ist.getUTCFullYear()).slice(2);
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `LUM-${yy}${mm}${dd}-${suffix}`;
}

export interface SpamVerdict {
  spam: boolean;
  reason?: string;
}

/** Cheap, explainable spam heuristics on top of rate limits. */
export function spamCheck(input: { message: string; subject: string; website?: string; elapsedMs?: number }): SpamVerdict {
  if (input.website && input.website.trim() !== "") return { spam: true, reason: "honeypot" };
  if (typeof input.elapsedMs === "number" && input.elapsedMs < 2500) return { spam: true, reason: "too-fast" };
  const text = `${input.subject}\n${input.message}`;
  const links = text.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (links > 3) return { spam: true, reason: "too-many-links" };
  if (/(.)\1{24,}/.test(text)) return { spam: true, reason: "repeated-characters" };
  if (/\b(viagra|casino|crypto ?airdrop|seo services|backlinks|loan offer)\b/i.test(text)) {
    return { spam: true, reason: "keywords" };
  }
  return { spam: false };
}
