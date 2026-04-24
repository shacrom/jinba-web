import type { Database } from "@/types/database";
/**
 * supabase-browser.ts — F2 auth
 *
 * Browser-side Supabase client. Used by any React island that needs to
 * talk to Supabase directly (e.g. a form that submits without a full
 * page reload). Reads session cookies through @supabase/ssr's browser
 * helper so state stays in sync with server rendering.
 */
import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new Error(
      "getSupabaseBrowserClient: missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  client = createBrowserClient<Database>(url, key);
  return client;
}
