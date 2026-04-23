/**
 * src/lib/ingest/seed.ts — D05 (data-sources-strategy)
 *
 * Pure logic for seeding the 5 niche gens from data/seed-prices.csv.
 * Used by both:
 *   - scripts/seed-price-aggregates.ts  (one-shot CLI)
 *   - src/pages/api/cron/seed-prices.ts (monthly cron)
 *
 * Design decisions:
 * - Reads CSV with node:fs + node:readline — no new deps.
 * - dry-run mode logs rows as JSON without any DB writes.
 * - resolveGenIds validates all slugs BEFORE any upsert; if any slug is
 *   unresolvable the function returns without writing (fail-fast).
 * - After a successful write, calls refresh_price_aggregates_daily() (non-fatal).
 * - external_id is "${gen_slug}:${year}:${observed_at}" — stable and deterministic
 *   across re-runs (idempotency depends on the DB unique constraint).
 */
import { createReadStream } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { IngestedPricePoint } from "./types";
import { resolveGenIds, upsertBatch } from "./upsert";

export interface SeedResult {
  inserted: number;
  updated: number;
  rejected: number;
  mv_refreshed: boolean;
  dryRun: boolean;
  error?: string;
}

// Resolve the CSV path relative to this file, regardless of CWD.
// __dirname is not available in ESM — use import.meta.url.
const DIR = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(DIR, "../../../data/seed-prices.csv");

interface CsvRow {
  gen_slug: string;
  year: number;
  km_p50: number;
  price_p50: number;
  observed_at: string;
}

/**
 * Parse data/seed-prices.csv into typed rows.
 * Skips the header row and any blank lines.
 * Throws if the file cannot be read.
 */
async function parseSeedCsv(): Promise<CsvRow[]> {
  const rows: CsvRow[] = [];
  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: "utf-8" }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  let isHeader = true;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }
    const parts = trimmed.split(",");
    // Expected: gen_slug,year,km_p50,price_p50,observed_at
    if (parts.length < 5) continue;
    const [gen_slug, yearStr, kmStr, priceStr, observed_at] = parts;
    const year = Number.parseInt(yearStr ?? "", 10);
    const km_p50 = Number.parseInt(kmStr ?? "", 10);
    const price_p50 = Number.parseInt(priceStr ?? "", 10);
    if (!gen_slug || Number.isNaN(year) || Number.isNaN(km_p50) || Number.isNaN(price_p50))
      continue;
    rows.push({ gen_slug, year, km_p50, price_p50, observed_at: observed_at?.trim() ?? "" });
  }

  return rows;
}

/**
 * Seed the 5 niche-gen reference price rows from data/seed-prices.csv.
 *
 * @param options.dryRun - When true, logs rows as JSON without DB writes.
 * @returns SeedResult with counts and status flags.
 */
export async function seedNichePrices({ dryRun }: { dryRun: boolean }): Promise<SeedResult> {
  const result: SeedResult = {
    inserted: 0,
    updated: 0,
    rejected: 0,
    mv_refreshed: false,
    dryRun,
  };

  // Parse CSV
  let csvRows: CsvRow[];
  try {
    csvRows = await parseSeedCsv();
  } catch (err) {
    result.error = `Failed to read seed CSV: ${String(err)}`;
    return result;
  }

  if (csvRows.length === 0) {
    result.error = "Seed CSV is empty or unreadable";
    return result;
  }

  // Map to IngestedPricePoint shape
  const points: IngestedPricePoint[] = csvRows.map((row) => ({
    source_slug: "seed" as const,
    gen_slug: row.gen_slug,
    external_id: `${row.gen_slug}:${row.year}:${row.observed_at}`,
    year: row.year,
    km: row.km_p50,
    price: row.price_p50,
    currency: "EUR" as const,
    observed_at: row.observed_at,
  }));

  // Dry-run: log and return without DB writes
  if (dryRun) {
    console.log(
      JSON.stringify({
        level: "info",
        source: "seed",
        msg: "dry-run — rows that would be upserted",
        count: points.length,
        rows: points,
      })
    );
    result.inserted = 0;
    return result;
  }

  // Validate all slugs before any DB write (fail-fast)
  const allSlugs = [...new Set(points.map((p) => p.gen_slug))];
  const idMap = await resolveGenIds(allSlugs);
  const unresolvable = allSlugs.filter((s) => !idMap.has(s));

  if (unresolvable.length > 0) {
    result.rejected = unresolvable.length;
    result.error = `Unresolvable gen_slugs: ${unresolvable.join(", ")}`;
    console.error(
      JSON.stringify({
        level: "error",
        source: "seed",
        msg: "unresolvable gen_slugs — aborting without DB writes",
        unresolvable,
      })
    );
    return result;
  }

  // Upsert (runId prefixed with "seed-" per design §2.8)
  const runId = `seed-${Date.now()}`;
  const upsertResult = await upsertBatch(points, runId);

  result.inserted = upsertResult.inserted;
  result.updated = upsertResult.updated;
  result.rejected += upsertResult.rejected;
  if (upsertResult.error) result.error = upsertResult.error;

  // Refresh MV — non-fatal (REQ-SEED-06)
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.rpc("refresh_price_aggregates_daily");
      if (error) {
        console.error(
          JSON.stringify({
            level: "error",
            source: "seed",
            msg: "mv refresh failed (non-fatal)",
            error: error.message,
          })
        );
      } else {
        result.mv_refreshed = true;
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          source: "seed",
          msg: "mv refresh threw (non-fatal)",
          err: String(err),
        })
      );
    }
  }

  return result;
}
