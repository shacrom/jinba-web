import type { Database } from "@/types/database";
/**
 * auth.ts — F2 session helpers
 *
 * Thin wrappers around the Supabase server client that live on `Astro.locals`.
 * Every helper is safe to call without a session — getUser / getProfile return
 * null when anonymous. `requireAuth` and `requireAdmin` return a Response
 * (redirect / 403) on failure; the caller must return that Response.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AstroGlobal } from "astro";

type DbClient = SupabaseClient<Database>;

export interface Profile {
  id: string;
  display_name: string | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
}

/** Resolve the authenticated user (or null when anonymous / client missing). */
export async function getUser(supabase: DbClient | undefined): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/** Fetch the profile row for a given user id. */
export async function getProfile(
  supabase: DbClient | undefined,
  userId: string
): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

/**
 * Shortcut for pages that must be logged in. Returns `{ user, profile }`
 * when authenticated, or a `Response` that the caller MUST return.
 */
export async function requireAuth(
  Astro: AstroGlobal,
  redirectTo = `/${Astro.params.lang ?? "es"}/auth/login`
): Promise<{ user: User; profile: Profile } | Response> {
  const supabase = Astro.locals.supabase;
  const user = await getUser(supabase);
  if (!user) {
    const from = Astro.url.pathname + Astro.url.search;
    const url = new URL(redirectTo, Astro.url);
    url.searchParams.set("from", from);
    return Astro.redirect(url.pathname + url.search);
  }
  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return Astro.redirect(redirectTo);
  }
  return { user, profile };
}

/**
 * Shortcut for admin-only pages. Non-admins get a 404 (hide the existence
 * of the admin surface from normal users).
 */
export async function requireAdmin(
  Astro: AstroGlobal
): Promise<{ user: User; profile: Profile } | Response> {
  const result = await requireAuth(Astro);
  if (result instanceof Response) return result;
  if (result.profile.role !== "admin") {
    return new Response("not found", { status: 404 });
  }
  return result;
}

/** Quick boolean admin check for template-level decisions. */
export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === "admin";
}
