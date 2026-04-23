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

/**
 * Anon client — enforces Row Level Security.
 * Use for public data reads in .astro server components.
 * Null when env vars are not configured (CI / local builds without .env).
 *
 * For service-role writes, import from @/lib/supabase-admin (B02 — removed
 * duplicate supabaseAdmin export; canonical lives in supabase-admin.ts).
 */
export const supabase: SupabaseClient<Database> | null =
  url && anonKey
    ? createClient<Database>(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        db: { schema: "public" },
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
