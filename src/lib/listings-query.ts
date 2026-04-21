/**
 * listings-query.ts — Zod param schema + Supabase query builder for M3 listings.
 * REQ-FILTER-01, REQ-FILTER-02, REQ-PAGI-01.
 * W-04 fix: all row types derived from Database['public']['Views']['listings_public']['Row'].
 * W-05 fix: Zod validates all URL params before use.
 */
import type { Database } from "@/types/database";
import { z } from "zod";

// ── Row types from DB shim (W-04 fix) ───────────────────────────────────────

export type ListingRow = Database["public"]["Views"]["listings_public"]["Row"];
export type ListingPhotoRow = Database["public"]["Tables"]["listing_photos"]["Row"];

export interface ListingWithPhoto extends ListingRow {
  /** First processed photo for the listing, or null */
  photo: Pick<ListingPhotoRow, "storage_path" | "width" | "height" | "privacy_processed_at"> | null;
}

// ── Param schema (W-05 fix) ──────────────────────────────────────────────────

const SORT_VALUES = ["last_seen_at_desc", "price_asc", "price_desc"] as const;

export const ListingParamsSchema = z.object({
  /** Generation slug filter (e.g. "na"). When provided, only listings of this gen show. */
  gen: z.string().optional(),
  price_min: z.coerce.number().int().nonnegative().optional().catch(undefined),
  price_max: z.coerce.number().int().positive().optional().catch(undefined),
  year_min: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
  year_max: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
  km_max: z.coerce.number().int().nonnegative().optional().catch(undefined),
  status: z.enum(["active", "inactive", "expired"]).optional().catch(undefined),
  source: z.coerce.number().int().positive().optional().catch(undefined),
  q: z.string().max(200).optional().catch(undefined),
  /** Keyset cursor: id of the last listing on the previous page */
  cursor: z.coerce.number().int().positive().optional().catch(undefined),
  sort: z.enum(SORT_VALUES).optional().catch(undefined),
});

export type ListingParams = z.infer<typeof ListingParamsSchema>;

/** Parse URL search params (URLSearchParams or Record) — invalid values are coerced/stripped. */
export function parseListingParams(
  raw: URLSearchParams | Record<string, string | undefined>
): ListingParams {
  const obj: Record<string, string | undefined> =
    raw instanceof URLSearchParams ? Object.fromEntries(raw.entries()) : raw;
  return ListingParamsSchema.parse(obj);
}

// ── Query builder ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/**
 * Build a Supabase query for listings_public with filters + keyset pagination.
 * Returns the query builder — call .then() or await to execute.
 */
export function buildListingsQuery(
  client: NonNullable<import("@supabase/supabase-js").SupabaseClient<Database>>,
  params: ListingParams,
  /** When provided, pins the generation_id rather than filtering by slug */
  pinnedGenerationId?: number
) {
  let q = client
    .from("listings_public")
    .select(
      "id, price, currency, year, km, location_text, url, last_seen_at, source_id, status, generation_id, make_id, model_id",
      { count: "exact" }
    )
    .limit(PAGE_SIZE + 1); // fetch one extra to determine if there's a next page

  // Generation filter
  if (pinnedGenerationId != null) {
    q = q.eq("generation_id", pinnedGenerationId);
  } else if (params.gen) {
    // We cannot filter by slug directly on listings_public — caller must resolve gen_id first.
    // This branch is used on the index route where no pinnedGenerationId is given.
    // gen slug -> id resolution happens upstream in the route.
  }

  // Price filters
  if (params.price_min != null) q = q.gte("price", params.price_min);
  if (params.price_max != null) q = q.lte("price", params.price_max);

  // Year filters
  if (params.year_min != null) q = q.gte("year", params.year_min);
  if (params.year_max != null) q = q.lte("year", params.year_max);

  // KM filter
  if (params.km_max != null) q = q.lte("km", params.km_max);

  // Status filter (default: active)
  q = q.eq("status", params.status ?? "active");

  // Source filter
  if (params.source != null) q = q.eq("source_id", params.source);

  // Sort
  const sort = params.sort ?? "last_seen_at_desc";
  if (sort === "price_asc") {
    q = q.order("price", { ascending: true }).order("id", { ascending: false });
  } else if (sort === "price_desc") {
    q = q.order("price", { ascending: false }).order("id", { ascending: false });
  } else {
    // last_seen_at DESC (default)
    q = q.order("last_seen_at", { ascending: false }).order("id", { ascending: false });
  }

  // Keyset pagination: cursor is the id of the last item on the previous page
  if (params.cursor != null) {
    if (sort === "price_asc") {
      q = q.gt("id", params.cursor);
    } else {
      // For DESC sorts, use lt on id as secondary key
      q = q.lt("id", params.cursor);
    }
  }

  return q;
}

/** Fetch first processed photo for each listing id in a single query. */
export async function fetchPhotosForListings(
  client: NonNullable<import("@supabase/supabase-js").SupabaseClient<Database>>,
  listingIds: number[]
): Promise<Map<number, ListingWithPhoto["photo"]>> {
  if (listingIds.length === 0) return new Map();

  const { data } = await client
    .from("listing_photos")
    .select("listing_id, storage_path, width, height, privacy_processed_at, position")
    .in("listing_id", listingIds)
    .not("privacy_processed_at", "is", null) // REQ-DATA-05: dual defense
    .order("position", { ascending: true });

  const map = new Map<number, ListingWithPhoto["photo"]>();
  for (const row of data ?? []) {
    if (row.listing_id != null && !map.has(row.listing_id)) {
      map.set(row.listing_id, {
        storage_path: row.storage_path,
        width: row.width,
        height: row.height,
        privacy_processed_at: row.privacy_processed_at,
      });
    }
  }
  return map;
}

export { PAGE_SIZE };
