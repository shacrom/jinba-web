/**
 * price-estimate.ts — M5
 * Pure math module for the fair-price calculator.
 * Keeps the heuristic (weighted median + km modifier + condition modifier)
 * out of the SSR endpoint so it can be unit-tested without a runtime.
 * REQ-CALC-MATH-01, REQ-CALC-MATH-02, REQ-CALC-MATH-03.
 */
import type { Condition } from "@/lib/price-estimate-types";

export interface MVRow {
  count: number | null;
  median: number | null;
}

/**
 * Weighted median across multiple daily price_aggregates_daily rows.
 * Each row's `median` is weighted by its `count` (the number of listings
 * feeding that day's aggregate).
 *
 * - Returns null when the input array is empty.
 * - When sum(count) === 0 (all rows carry null/0 counts), falls back to a
 *   simple equal-weighted mean of the row medians so sparse fixtures still
 *   yield a sensible baseline (REQ-CALC-MATH-01 fallback).
 */
export function weightedMedian(rows: MVRow[]): number | null {
  if (rows.length === 0) return null;

  let totalCount = 0;
  let weighted = 0;
  for (const r of rows) {
    const c = r.count ?? 0;
    totalCount += c;
    weighted += (r.median ?? 0) * c;
  }

  if (totalCount > 0) {
    return Math.round(weighted / totalCount);
  }

  // Fallback: equal-weighted mean of row medians.
  const sum = rows.reduce((acc, r) => acc + (r.median ?? 0), 0);
  return Math.round(sum / rows.length);
}

/**
 * Product-wide baseline for km/year. Used when a generation has too few
 * observations to derive a per-gen median (M5 N-03 fallback) and as the
 * default argument in unit tests.
 */
export const MEDIAN_KM_PER_YEAR = 15_000;

/**
 * km modifier: pushes the baseline down for high-km cars and up for low-km
 * cars, bounded to ±0.25 so extreme inputs can't nuke or double the price.
 * REQ-CALC-MATH-02.
 *
 * `medianKmPerYear` is the per-generation expected annual mileage (M5 N-03).
 * Falls back to the product-wide constant when the caller doesn't supply
 * one — keeps the pure-math module independent of DB access.
 */
export function kmModifier(
  km: number,
  year: number,
  currentYear: number = new Date().getUTCFullYear(),
  medianKmPerYear: number = MEDIAN_KM_PER_YEAR
): number {
  const age = Math.max(1, currentYear - year);
  const expected = medianKmPerYear * age;
  const delta = km - expected;
  if (delta === 0) return 0; // avoid `-0` (Object.is(-0, 0) === false)
  const ratio = delta / medianKmPerYear;
  const raw = -0.03 * ratio;
  return Math.max(-0.25, Math.min(0.25, raw));
}

/** Condition modifier table — REQ-CALC-MATH-03. */
export const CONDITION_MODIFIERS: Record<Condition, number> = {
  excellent: 0.1,
  good: 0.0,
  fair: -0.1,
  rough: -0.25,
};

export function conditionModifier(c: Condition): number {
  return CONDITION_MODIFIERS[c];
}

export interface ComputeEstimateInput {
  rows: MVRow[];
  km: number;
  year: number;
  condition: Condition;
  windowDays: number;
  currentYear?: number;
  /** Per-generation median km/year (M5 N-03). Defaults to `MEDIAN_KM_PER_YEAR`. */
  medianKmPerYear?: number;
}

export interface ComputeEstimateResult {
  estimate_eur: number;
  range: { low: number; high: number };
  basis: { median: number; count: number; window_days: number };
}

/**
 * Full pricing pipeline. Returns null when the MV has no rows (or the
 * baseline collapses to zero) so the caller can emit `{ available: false }`.
 * REQ-CALC-MATH-01/02/03.
 */
export function computeEstimate(input: ComputeEstimateInput): ComputeEstimateResult | null {
  const baseline = weightedMedian(input.rows);
  if (baseline === null || baseline <= 0) return null;

  const km = kmModifier(input.km, input.year, input.currentYear, input.medianKmPerYear);
  const cond = conditionModifier(input.condition);
  const adjusted = baseline * (1 + km) * (1 + cond);

  const estimate = Math.round(adjusted);
  const low = Math.round(adjusted * 0.93);
  const high = Math.round(adjusted * 1.07);

  const totalCount = input.rows.reduce((acc, r) => acc + (r.count ?? 0), 0);

  return {
    estimate_eur: estimate,
    range: { low, high },
    basis: { median: baseline, count: totalCount, window_days: input.windowDays },
  };
}
