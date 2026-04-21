import { z } from "zod";

/**
 * Public environment variables — safe to access from browser bundles.
 * All keys must be prefixed with PUBLIC_.
 */
export const PublicEnv = z.object({
  PUBLIC_SITE_URL: z.string().url(),
  PUBLIC_SUPABASE_URL: z.string().url(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
  PUBLIC_MEILI_URL: z.string().url().optional(),
  PUBLIC_MEILI_PUBLIC_KEY: z.string().optional(),
});

/**
 * Server-only environment variables — MUST NOT be exposed in client bundles.
 * Read only in .astro files or server-side lib modules.
 */
export const ServerEnv = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  JINBA_DB_PATH: z.string().optional(),
});

export type PublicEnvT = z.infer<typeof PublicEnv>;
export type ServerEnvT = z.infer<typeof ServerEnv>;
