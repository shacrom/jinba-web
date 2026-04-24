import { defineMiddleware } from "astro:middleware";
/**
 * middleware.ts — F2 auth wiring
 *
 * Attaches a request-scoped Supabase server client to `Astro.locals.supabase`.
 * Pages and API routes read/write the session via this client — cookies
 * are round-tripped automatically.
 *
 * If the anon env vars are missing (local build without .env, CI prerender
 * steps), `locals.supabase` is left undefined and pages fall back to
 * anonymous behaviour. This keeps `astro build` working everywhere.
 */
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const onRequest = defineMiddleware(async ({ request, cookies, locals }, next) => {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    locals.supabase = createSupabaseServerClient({ request, cookies });
  }
  return next();
});
