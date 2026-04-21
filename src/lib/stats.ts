/**
 * stats.ts — Pure math utilities for price aggregate statistics.
 * T34: Extracted from LivePriceStats.astro for testability.
 */

export interface PriceRow {
  count: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
}

export interface AggStats {
  totalCount: number;
  median: number;
  p25: number;
  p75: number;
}

/**
 * Computes a weighted aggregate across multiple daily price rows.
 * Returns null when the input is empty.
 * The caller decides whether totalCount meets the display threshold (>= 5).
 */
export function aggregateStats(rows: PriceRow[]): AggStats | null {
  if (rows.length === 0) return null;

  let totalCount = 0;
  let medianSum = 0;
  let p25Sum = 0;
  let p75Sum = 0;

  for (const r of rows) {
    const c = r.count ?? 0;
    totalCount += c;
    medianSum += (r.median ?? 0) * c;
    p25Sum += (r.p25 ?? 0) * c;
    p75Sum += (r.p75 ?? 0) * c;
  }

  if (totalCount === 0) {
    // rows had only null counts — treat as single-point data with row values
    const first = rows[0];
    return {
      totalCount: 0,
      median: Math.round(first.median ?? 0),
      p25: Math.round(first.p25 ?? 0),
      p75: Math.round(first.p75 ?? 0),
    };
  }

  return {
    totalCount,
    median: Math.round(medianSum / totalCount),
    p25: Math.round(p25Sum / totalCount),
    p75: Math.round(p75Sum / totalCount),
  };
}
