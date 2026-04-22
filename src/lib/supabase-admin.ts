/**
 * src/lib/supabase-admin.ts — M8
 *
 * Server-only Supabase client using the service_role key. Bypasses RLS and is
 * therefore restricted to trusted server code (admin routes, scheduled jobs).
 *
 * BROWSER IMPORT GUARD: throws immediately when imported in a window-like
 * environment so a rogue `client:*` directive surfaces the leak at build time.
 *
 * The singleton may be `null` when env vars are missing (CI/local without a
 * real service_role). Callers must handle the null case and render a degraded
 * UI rather than throwing.
 *
 * Do NOT import this module from any file that has a `client:*` directive.
 */
import type { Database } from "@/types/database";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error(
    "[jinba-web] src/lib/supabase-admin.ts imported from the browser. Service-role access is server-side only."
  );
}

// Read both env vars via process.env so neither PUBLIC_SUPABASE_URL nor
// SUPABASE_SERVICE_ROLE_KEY gets inlined into the SSR bundle at build time.
// Vercel populates process.env for serverless functions at request time; this
// keeps secret rotation a dashboard operation (no rebuild required) and
// leaves the deployment artifact free of the service-role key.
const url = typeof process !== "undefined" ? process.env.PUBLIC_SUPABASE_URL : undefined;
const serviceRoleKey =
  typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined;

/**
 * Service-role admin client. `null` when env is not configured (CI/local).
 * Use only in trusted server-side code. Never import into client islands.
 */
export const supabaseAdmin: SupabaseClient<Database> | null =
  url && serviceRoleKey
    ? createClient<Database>(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        db: { schema: "public" },
      })
    : null;

/** Returns true when both PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set. */
export function isAdminConfigured(): boolean {
  return supabaseAdmin !== null;
}
