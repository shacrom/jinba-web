/**
 * src/lib/ingest/types.ts — D01 (data-sources-strategy)
 *
 * Zod schemas + inferred TS types for the Apify → staging-table ingest pipeline.
 * This is the single source of truth for data shapes at the external boundary.
 *
 * No I/O. No Supabase imports. Purely declarative.
 */
import { z } from "zod";

// ─── Apify actor output ────────────────────────────────────────────────────

/**
 * Minimum shape every Apify actor (Milanuncios + Wallapop) MUST emit.
 * Extra fields are allowed via .passthrough() — they will be present in the
 * parsed object but are not required. The actors are configured to normalise
 * the raw provider format so that both sources share this schema.
 */
export const ApifyListingSchema = z
  .object({
    url: z.string().url(),
    external_id: z.string().min(1), // stable provider ad ID
    price: z.number().nonnegative(), // EUR, already numeric from actor
    currency: z.literal("EUR"), // ES sources only — actor must normalise
    year: z.number().int().min(1950).max(2100),
    km: z.number().int().nonnegative().nullable(), // null when not posted
    observed_at: z.string().datetime(), // ISO 8601 UTC; actor sets to run end time
  })
  .passthrough();

export type ApifyListing = z.infer<typeof ApifyListingSchema>;

// ─── Normalised row (what we write to ingested_price_points) ───────────────

/**
 * Shape of a row destined for the `ingested_price_points` staging table.
 * Excludes DB-generated fields (id, ingest_run_id, created_at).
 * Created by normalize() and validated again in the cron handler for
 * defense-in-depth.
 */
export const IngestedPricePointSchema = z.object({
  source_slug: z.enum(["milanuncios", "wallapop", "seed"]),
  gen_slug: z.string().min(1), // e.g. "seat:ibiza:mk4"
  external_id: z.string().min(1),
  year: z.number().int().min(1950).max(2100),
  km: z.number().int().nonnegative().nullable(),
  price: z.number().nonnegative(),
  currency: z.literal("EUR"),
  observed_at: z.string().datetime(),
});

export type IngestedPricePoint = z.infer<typeof IngestedPricePointSchema>;

// ─── Ingest target registry ────────────────────────────────────────────────

/**
 * One (generation, source) scraping pair. The cron iterates INGEST_TARGETS
 * and calls pullDataset for each. dataset_id is the Apify default-dataset ID
 * assigned to the scheduled actor run for this (gen, source) pair.
 *
 * dataset_id is set to "" as a placeholder until USER_ACTION G03 fills real IDs.
 * An empty dataset_id causes pullDataset to return 0 rows (empty response from
 * Apify) — the run proceeds without error for that tuple.
 */
export interface IngestTarget {
  gen_slug: string; // "seat:ibiza:mk4"
  source_slug: "milanuncios" | "wallapop";
  dataset_id: string; // Apify dataset ID (pin per scheduled run)
}
