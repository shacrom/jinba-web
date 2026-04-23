/**
 * src/lib/ingest/normalize.ts — D03 (data-sources-strategy)
 *
 * Pure function: converts one Apify actor row into one IngestedPricePoint.
 * No I/O, no async, no Supabase calls. Fully unit-testable in isolation.
 *
 * Design decisions:
 * - price is rounded via Math.round() — drops sub-cent precision that Apify
 *   actors sometimes emit (e.g. "4523.7"). The staging table stores numeric(14,2)
 *   so an integer is always valid.
 * - source_slug and gen_slug come from the target, not the row, so they are
 *   always structurally valid (the target list is the authoritative registry).
 * - Extra Apify fields (passthrough from ApifyListingSchema) are intentionally
 *   NOT carried forward — IngestedPricePoint is a strict pick, not a superset.
 */
import type { ApifyListing, IngestTarget, IngestedPricePoint } from "./types";

/**
 * Map one raw Apify listing to a normalised price-point row ready for upsert.
 *
 * @param row    - Validated ApifyListing (already passed ApifyListingSchema)
 * @param target - The IngestTarget that produced this row (provides gen_slug, source_slug)
 * @returns      IngestedPricePoint with all required fields populated
 */
export function normalize(row: ApifyListing, target: IngestTarget): IngestedPricePoint {
  return {
    source_slug: target.source_slug,
    gen_slug: target.gen_slug,
    external_id: row.external_id,
    year: row.year,
    km: row.km,
    price: Math.round(row.price),
    currency: row.currency,
    observed_at: row.observed_at,
  };
}
