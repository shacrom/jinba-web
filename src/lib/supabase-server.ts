import type { Database } from "@/types/database";
/**
 * supabase-server.ts — F2 auth
 *
 * Creates a request-scoped Supabase server client with session cookies
 * wired through Astro's request/response cookie APIs. Use via
 * `Astro.locals.supabase` inside any SSR page or API route
 * (middleware attaches it per request).
 *
 * Reads the same anon key as the browser-side client. Session state lives
 * in cookies managed by @supabase/ssr — never inlined into rendered HTML.
 */
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";

export function createSupabaseServerClient({
  request,
  cookies,
}: {
  request: Request;
  cookies: AstroCookies;
}) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !key) {
    throw new Error(
      "createSupabaseServerClient: missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        const header = request.headers.get("Cookie") ?? "";
        return parseCookieHeader(header).map(({ name, value }) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, options);
        }
      },
    },
  });
}
