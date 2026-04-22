/**
 * price-history.ts — M4
 * Helper to fetch price_aggregates_daily rows for a single generation over a
 * sliding window. Returns [] gracefully when Supabase is unavailable or empty.
 * REQ-PH-01, REQ-PH-06, REQ-PH-09.
 */
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

export interface PricePoint {
  date: string; // ISO "YYYY-MM-DD"
  median: number;
  p25: number;
  p75: number;
  count: number;
}

type MVRow = Pick<
  Database["public"]["Views"]["price_aggregates_daily"]["Row"],
  "date" | "median" | "p25" | "p75" | "count"
>;

export interface GetPriceHistoryOptions {
  generationId: number;
  currency?: string;
  windowDays?: number;
}

/**
 * Fetches price_aggregates_daily for a generation over the last N days.
 * Returns an array ordered ascending by date.
 * Returns empty array when:
 *  - Supabase client is null (missing env vars / CI);
 *  - The query errors;
 *  - No rows match the generation/currency/window.
 */
export async function getPriceHistory(opts: GetPriceHistoryOptions): Promise<PricePoint[]> {
  const { generationId, currency = "EUR", windowDays = 365 } = opts;

  if (!supabase) return [];

  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString().slice(0, 10);

  try {
    const { data, error } = await supabase
      .from("price_aggregates_daily")
      .select("date, median, p25, p75, count")
      .eq("generation_id", generationId)
      .eq("currency", currency)
      .gte("date", since)
      .order("date", { ascending: true });

    if (error || !data) return [];

    const rows = data as MVRow[];
    return rows
      .filter((r): r is MVRow & { date: string } => typeof r.date === "string")
      .map((r) => ({
        date: r.date,
        median: Math.round(r.median ?? 0),
        p25: Math.round(r.p25 ?? 0),
        p75: Math.round(r.p75 ?? 0),
        count: r.count ?? 0,
      }));
  } catch {
    return [];
  }
}
