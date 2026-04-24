/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Request-scoped Supabase client with session cookies wired in.
     *  Undefined when the anon env vars are missing (local build without .env,
     *  CI prerender step, etc). Pages must handle the undefined case and fall
     *  back to anonymous behaviour. */
    supabase?: import("@supabase/supabase-js").SupabaseClient<import("@/types/database").Database>;
  }
}
