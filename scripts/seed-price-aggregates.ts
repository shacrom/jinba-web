/**
 * scripts/seed-price-aggregates.ts — F02 (data-sources-strategy)
 *
 * CLI wrapper for seedNichePrices(). Reads data/seed-prices.csv and upserts
 * the 5 niche-gen reference medians into ingested_price_points.
 *
 * Usage:
 *   npm run seed:prices           — live run
 *   npm run seed:prices:dry       — dry-run (logs rows, no DB writes)
 *
 * Exit codes:
 *   0 — success (or dry-run)
 *   1 — any rows were rejected (unknown slug, DB error, etc.)
 */
import { seedNichePrices } from "@/lib/ingest/seed";

const dryRun = process.argv.includes("--dry-run");

const result = await seedNichePrices({ dryRun });

console.log(JSON.stringify({ ...result, dryRun }, null, 2));

if (result.error) {
  console.error(`[seed] Error: ${result.error}`);
}

// Exit 1 if any rows were rejected (and not a dry-run) — REQ-SEED-03
process.exit(result.rejected > 0 && !dryRun ? 1 : 0);
