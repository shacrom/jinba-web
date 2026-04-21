import type { Database } from "@/types/database";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY guard — throws loudly if imported in a browser bundle.
if (typeof window !== "undefined") {
  throw new Error(
    "[jinba-web] src/lib/supabase.ts imported from the browser. Supabase access must be server-side only."
  );
}

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!url) throw new Error("[jinba-web] PUBLIC_SUPABASE_URL is required");
if (!anonKey) throw new Error("[jinba-web] PUBLIC_SUPABASE_ANON_KEY is required");

/**
 * Anon client — enforces Row Level Security.
 * Use for public data reads in .astro server components.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "public" },
});

/**
 * Admin client — bypasses RLS via service role.
 * Null when SUPABASE_SERVICE_ROLE_KEY is not configured.
 * Use only for trusted server-side mutations.
 */
export const supabaseAdmin: SupabaseClient<Database> | null = serviceRoleKey
  ? createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
