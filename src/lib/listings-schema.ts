/**
 * listings-schema.ts — Zod schema for validating Supabase query result rows.
 * REQ-DATA-04 (W-05 fix): validates the shape of rows returned from listings_public.
 * On validation failure: logs a warning and returns empty array.
 */
import { z } from "zod";

// Nullable number/string helpers matching the DB view shape
const nullableInt = z.number().int().nullable();
const nullableStr = z.string().nullable();
const nullableFloat = z.number().nullable();

export const ListingRowSchema = z.object({
  id: nullableInt,
  price: nullableFloat,
  currency: nullableStr,
  year: nullableInt,
  km: nullableInt,
  location_text: nullableStr,
  url: nullableStr,
  last_seen_at: nullableStr,
  source_id: nullableInt,
  status: nullableStr,
  generation_id: nullableInt,
  make_id: nullableInt,
  model_id: nullableInt,
});

export type ValidatedListingRow = z.infer<typeof ListingRowSchema>;

/**
 * Validate an array of raw rows from listings_public.
 * Invalid rows are skipped with a console.warn (REQ-DATA-04).
 */
export function validateListingRows(raw: unknown[]): ValidatedListingRow[] {
  const results: ValidatedListingRow[] = [];
  for (const row of raw) {
    const parsed = ListingRowSchema.safeParse(row);
    if (parsed.success) {
      results.push(parsed.data);
    } else {
      console.warn("[listings-schema] Row validation failed:", parsed.error.flatten());
    }
  }
  return results;
}
