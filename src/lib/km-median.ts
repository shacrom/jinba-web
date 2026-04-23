import { MEDIAN_KM_PER_YEAR } from "@/lib/price-estimate";
/**
 * km-median.ts — M5 N-03
 *
 * Resolves the per-generation median km/year by calling the SECURITY DEFINER
 * function `public.get_median_km_per_year(gen_id)` in Supabase. The function
 * reads from `ingested_price_points` internally (which anon cannot see
 * directly under the deny-all RLS) and returns the product-wide baseline
 * (15_000) when the generation has fewer than 3 observations.
 *
 * Anything failure-adjacent (Supabase unavailable, RPC error, unexpected
 * null) falls back to the baseline so the calculator stays usable.
 */
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseAnon = SupabaseClient<Database>;

export async function resolveMedianKmPerYear(
  generationId: number,
  client: SupabaseAnon | null = supabase
): Promise<number> {
  if (!client) return MEDIAN_KM_PER_YEAR;

  try {
    const { data, error } = await client.rpc("get_median_km_per_year", {
      gen_id: generationId,
    });

    if (error || typeof data !== "number" || data <= 0) {
      return MEDIAN_KM_PER_YEAR;
    }

    return data;
  } catch {
    return MEDIAN_KM_PER_YEAR;
  }
}
