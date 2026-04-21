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

/**
 * Anon client — enforces Row Level Security.
 * Use for public data reads in .astro server components.
 * Null when env vars are not configured (CI / local builds without .env).
 */
export const supabase: SupabaseClient<Database> | null =
  url && anonKey
    ? createClient<Database>(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        db: { schema: "public" },
      })
    : null;

/**
 * Admin client — bypasses RLS via service role.
 * Null when SUPABASE_SERVICE_ROLE_KEY is not configured.
 * Use only for trusted server-side mutations.
 */
export const supabaseAdmin: SupabaseClient<Database> | null =
  url && serviceRoleKey
    ? createClient<Database>(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

/**
 * Compose a full public Supabase Storage URL from a relative storage path.
 * Falls back to a placeholder when PUBLIC_SUPABASE_URL is not set (CI).
 */
export function storageUrl(path: string, bucket = "listing-photos"): string {
  const base = (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) ?? "";
  if (!base) return "/placeholders/listing.webp";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
