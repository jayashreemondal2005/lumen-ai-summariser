import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { serverEnv, supabaseAdminConfigured, supabaseConfigured } from "./env";

/** Supabase client bound to the caller's auth cookies. RLS applies. */
export async function supabaseForRequest(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured()) return null;
  const env = serverEnv();
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;

/** Service-role client. Bypasses RLS: only for trusted server-side writes. */
export function supabaseAdmin(): SupabaseClient | null {
  if (!supabaseAdminConfigured()) return null;
  if (!admin) {
    const env = serverEnv();
    admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/** The verified current user (validated against Supabase Auth), or null. */
export async function currentUser(): Promise<{ user: User; client: SupabaseClient } | null> {
  const client = await supabaseForRequest();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { user: data.user, client };
}
