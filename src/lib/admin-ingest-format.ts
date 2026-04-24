import { formatRelative } from "@/lib/admin-scraping-format";
/**
 * src/lib/admin-ingest-format.ts — M8
 *
 * Pure formatters and roll-up helpers for the admin ingest telemetry section.
 * No IO; fully unit-testable.
 *
 * Covers rows from `public.ingested_price_points` — the staging table written
 * by the Vercel cron `/api/cron/sync-prices` (data-sources-strategy change).
 */
import type { Database } from "@/types/database";

// Re-export formatRelative so callers can use a single import if needed.
export { formatRelative };

export type IngestedPricePointRow = Database["public"]["Tables"]["ingested_price_points"]["Row"];

// ── Ingest run summary ────────────────────────────────────────────────────────

export interface IngestRunSummary {
  /** Free-text run UUID set by the cron handler (or "seed-..." for seed runs). */
  ingestRunId: string;
  /** Distinct source_slug values present in this run, sorted alphabetically. */
  sourceSlugs: string[];
  /** Total rows belonging to this run. */
  rowCount: number;
  /** Number of distinct gen_slug values touched. */
  gensTouched: number;
  /** Earliest observed_at among rows in this run (ISO string). */
  firstObservation: string | null;
  /** Latest observed_at among rows in this run (ISO string). */
  lastObservation: string | null;
  /** Latest created_at among rows in this run — wall-clock insert time. */
  lastInserted: string | null;
  /** Wall-clock duration from first to last created_at in this run, ms. */
  durationMs: number | null;
  /** Human-readable relative time for lastInserted. */
  lastInsertedRelative: string;
}

/**
 * Groups ingested_price_points rows by ingest_run_id, returns the 20 most
 * recent runs sorted by last created_at descending.
 */
export function aggregateIngestRuns(
  rows: IngestedPricePointRow[],
  now: Date = new Date()
): IngestRunSummary[] {
  if (rows.length === 0) return [];

  // Group by ingest_run_id
  const byRun = new Map<string, IngestedPricePointRow[]>();
  for (const row of rows) {
    const arr = byRun.get(row.ingest_run_id) ?? [];
    arr.push(row);
    byRun.set(row.ingest_run_id, arr);
  }

  const summaries: IngestRunSummary[] = [];

  for (const [runId, runRows] of byRun) {
    const sourceSlugs = [...new Set(runRows.map((r) => r.source_slug))].sort();
    const genSlugs = new Set(runRows.map((r) => r.gen_slug));

    // ISO string comparisons work lexicographically for UTC timestamps.
    let firstObservation: string | null = null;
    let lastObservation: string | null = null;
    let firstInserted: string | null = null;
    let lastInserted: string | null = null;

    for (const r of runRows) {
      if (!firstObservation || r.observed_at < firstObservation) firstObservation = r.observed_at;
      if (!lastObservation || r.observed_at > lastObservation) lastObservation = r.observed_at;
      if (!firstInserted || r.created_at < firstInserted) firstInserted = r.created_at;
      if (!lastInserted || r.created_at > lastInserted) lastInserted = r.created_at;
    }

    const durationMs =
      firstInserted && lastInserted
        ? new Date(lastInserted).getTime() - new Date(firstInserted).getTime()
        : null;

    summaries.push({
      ingestRunId: runId,
      sourceSlugs,
      rowCount: runRows.length,
      gensTouched: genSlugs.size,
      firstObservation,
      lastObservation,
      lastInserted,
      durationMs,
      lastInsertedRelative: formatRelative(lastInserted, now),
    });
  }

  // Sort by lastInserted desc (most recent first), then take top 20.
  summaries.sort((a, b) => {
    if (!a.lastInserted && !b.lastInserted) return 0;
    if (!a.lastInserted) return 1;
    if (!b.lastInserted) return -1;
    return b.lastInserted.localeCompare(a.lastInserted);
  });

  return summaries.slice(0, 20);
}

// ── Ingest source health ──────────────────────────────────────────────────────

export interface IngestSourceHealth {
  /** e.g. "milanuncios" | "wallapop" | "seed" */
  sourceSlug: string;
  /** Total rows across all time for this source. */
  totalRows: number;
  /** Latest created_at for this source (ISO string). */
  lastInsert: string | null;
  /** Human-readable relative time for lastInsert. */
  lastInsertRelative: string;
  /** Rows inserted in the last 24 h relative to `now`. */
  rows24h: number;
  /** Rows inserted in the last 7 days relative to `now`. */
  rows7d: number;
  /**
   * True when lastInsert is more than 24 h ago AND source_slug is not "seed".
   * Seed rows are reference data, not expected to refresh daily.
   */
  isStale: boolean;
}

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_24H;

/**
 * Groups ingested_price_points rows by source_slug and computes health metrics.
 * Returns one entry per distinct source_slug found in `rows`.
 */
export function aggregateIngestSources(
  rows: IngestedPricePointRow[],
  now: Date = new Date()
): IngestSourceHealth[] {
  if (rows.length === 0) return [];

  const bySrc = new Map<string, IngestedPricePointRow[]>();
  for (const row of rows) {
    const arr = bySrc.get(row.source_slug) ?? [];
    arr.push(row);
    bySrc.set(row.source_slug, arr);
  }

  const nowMs = now.getTime();
  const results: IngestSourceHealth[] = [];

  for (const [slug, srcRows] of bySrc) {
    let lastInsert: string | null = null;
    let rows24h = 0;
    let rows7d = 0;

    for (const r of srcRows) {
      if (!lastInsert || r.created_at > lastInsert) lastInsert = r.created_at;

      const ageMs = nowMs - new Date(r.created_at).getTime();
      if (ageMs <= MS_24H) rows24h++;
      if (ageMs <= MS_7D) rows7d++;
    }

    const lastInsertAgeMs = lastInsert
      ? nowMs - new Date(lastInsert).getTime()
      : Number.POSITIVE_INFINITY;
    // seed source is reference data — never flagged stale regardless of age.
    const isStale = slug !== "seed" && lastInsertAgeMs > MS_24H;

    results.push({
      sourceSlug: slug,
      totalRows: srcRows.length,
      lastInsert,
      lastInsertRelative: formatRelative(lastInsert, now),
      rows24h,
      rows7d,
      isStale,
    });
  }

  // Stable sort: non-seed active sources first, then seed; alphabetical within.
  results.sort((a, b) => {
    if (a.sourceSlug === "seed" && b.sourceSlug !== "seed") return 1;
    if (a.sourceSlug !== "seed" && b.sourceSlug === "seed") return -1;
    return a.sourceSlug.localeCompare(b.sourceSlug);
  });

  return results;
}
