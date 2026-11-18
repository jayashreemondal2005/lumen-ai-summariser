import "server-only";
import { z } from "zod";

// Server-only environment. Importing this from a client component fails the
// build (server-only), so secrets can never reach the browser bundle.

const EnvSchema = z.object({
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_MODEL: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  /** Publishable key (sb_publishable_...) or legacy anon key. Public by design. */
  SUPABASE_PUBLISHABLE_KEY: z.string().optional().default(""),
  /** Secret key (sb_secret_...) or legacy service_role key. Server only. */
  SUPABASE_SECRET_KEY: z.string().optional().default(""),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().optional().default(465),
  SUPPORT_INBOX: z.string().optional().default(""),
  OWNER_EMAIL: z.string().optional().default(""),
  IP_HASH_SALT: z.string().optional().default("lumen-dev-salt"),
});

export type ServerEnv = z.infer<typeof EnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached && process.env.NODE_ENV === "production") return cached;
  cached = EnvSchema.parse({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_HOST: process.env.SMTP_HOST || undefined,
    SMTP_PORT: process.env.SMTP_PORT || undefined,
    SUPPORT_INBOX: process.env.SUPPORT_INBOX,
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    IP_HASH_SALT: process.env.IP_HASH_SALT || undefined,
  });
  return cached;
}

export function supabaseConfigured(): boolean {
  const e = serverEnv();
  return Boolean(e.NEXT_PUBLIC_SUPABASE_URL && e.SUPABASE_PUBLISHABLE_KEY);
}

export function supabaseAdminConfigured(): boolean {
  const e = serverEnv();
  return Boolean(e.NEXT_PUBLIC_SUPABASE_URL && e.SUPABASE_SECRET_KEY);
}

export function mailConfigured(): boolean {
  const e = serverEnv();
  return Boolean(e.SMTP_USER && e.SMTP_PASS && e.SUPPORT_INBOX);
}
