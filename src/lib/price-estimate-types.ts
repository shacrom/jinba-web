/**
 * price-estimate-types.ts — M5
 * Shared types + Zod schemas for the fair-price calculator.
 * Consumed by the React island (`CalculatorForm.tsx`), the server endpoint
 * (`/api/price-estimate`), and the build-time taxonomy loader.
 * REQ-CALC-ENDPOINT-01, REQ-CALC-FORM-01.
 */
import { z } from "zod";

export const CONDITIONS = ["excellent", "good", "fair", "rough"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CURRENT_YEAR = new Date().getUTCFullYear();

/** Zod schema for the POST /api/price-estimate request body. */
export const PriceEstimateRequest = z.object({
  make: z.string().min(1).max(64),
  model: z.string().min(1).max(64),
  gen: z.string().min(1).max(64),
  trim: z.string().min(1).max(64).optional(),
  year: z
    .number()
    .int()
    .min(1950)
    .max(CURRENT_YEAR + 1),
  km: z.number().int().min(0).max(999_999),
  condition: z.enum(CONDITIONS),
  currency: z.literal("EUR").default("EUR"),
});
export type PriceEstimateRequestT = z.infer<typeof PriceEstimateRequest>;

/** Success response shape (available = true). */
export interface EstimateAvailable {
  available: true;
  estimate_eur: number;
  range: { low: number; high: number };
  basis: { median: number; count: number; window_days: number };
}

/** Unavailable response shape (empty MV or missing env). */
export interface EstimateUnavailable {
  available: false;
}

export type PriceEstimateResponse = EstimateAvailable | EstimateUnavailable;

// ── Taxonomy (server-rendered into the island) ─────────────────────────────

export interface CalcTaxonomyTrim {
  slug: string;
  name_es: string;
  name_en: string;
}

export interface CalcTaxonomyGen {
  slug: string;
  name_es: string;
  name_en: string;
  year_start: number;
  year_end: number | null;
  trims: CalcTaxonomyTrim[];
}

export interface CalcTaxonomyModel {
  slug: string;
  name_es: string;
  name_en: string;
  gens: CalcTaxonomyGen[];
}

export interface CalcTaxonomyMake {
  slug: string;
  name_es: string;
  name_en: string;
  models: CalcTaxonomyModel[];
}

export type CalcTaxonomy = CalcTaxonomyMake[];
