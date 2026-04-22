/**
 * src/lib/admin-scraping-format.ts — M8
 *
 * Pure formatters and roll-up helpers for the admin scraping dashboard.
 * No IO; fully unit-testable.
 */
import type { Database } from "@/types/database";

export type ScrapeRunRow = Database["public"]["Tables"]["scrape_runs"]["Row"];
export type ScrapeErrorRow = Database["public"]["Tables"]["scrape_errors"]["Row"];
export type SourceRow = Database["public"]["Tables"]["sources"]["Row"];

export type ErrorBucket = "http" | "parse" | "privacy" | "other";

/**
 * Formats a duration in milliseconds as a human-friendly string.
 *   null/undefined  -> "—"
 *   < 1000 ms       -> "< 1 s"
 *   < 60_000 ms     -> "N s"
 *   >=60_000 ms     -> "N min M s"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return "< 1 s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes} min ${rem} s`;
}

/**
 * Formats an ISO timestamp as a Spanish relative-time string.
 *   null/undefined/invalid -> "—"
 *   future                  -> "ahora"
 *   < 60 s   -> "hace N s"
 *   < 60 min -> "hace N min"
 *   < 24 h   -> "hace N h"
 *   else     -> "hace N d"
 */
export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return "ahora";
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

/**
 * Computes the clean-run fraction over the provided run array.
 * Empty -> "N/D". Rows with items_errored === 0 count as clean.
 */
export function formatSuccessRate(runs: Array<{ items_errored: number | null }>): string {
  if (runs.length === 0) return "N/D";
  const clean = runs.filter((r) => (r.items_errored ?? 0) === 0).length;
  const pct = (clean / runs.length) * 100;
  return `${pct.toFixed(1)} %`;
}

/**
 * Best-effort classification of a scrape_errors.error_type string into a UI bucket.
 */
export function classifyErrorType(errorType: string): ErrorBucket {
  const lower = errorType.toLowerCase();
  if (lower.startsWith("http")) return "http";
  if (lower.startsWith("parse")) return "parse";
  if (lower.startsWith("privacy")) return "privacy";
  return "other";
}

export interface FormattedErrorRow {
  id: number;
  sourceSlug: string;
  errorType: string;
  bucket: ErrorBucket;
  /** Full URL (for the anchor href + title attribute); null when missing. */
  url: string | null;
  /** Truncated URL for display; null when url is null. */
  urlDisplay: string | null;
  /** Truncated message safe for table cell. */
  message: string;
  occurredDisplay: string;
}

/** Shapes a scrape_errors row for display. URLs are truncated to 60 chars, messages to 120. */
export function formatErrorRow(
  row: ScrapeErrorRow,
  sourceSlugByRunId: Map<number, string>,
  now: Date = new Date()
): FormattedErrorRow {
  const MAX_URL = 60;
  const MAX_MSG = 120;
  const url = row.url ?? null;
  const urlDisplay = url ? (url.length > MAX_URL ? `${url.slice(0, MAX_URL - 1)}…` : url) : null;
  const message =
    row.message.length > MAX_MSG ? `${row.message.slice(0, MAX_MSG - 1)}…` : row.message;
  return {
    id: row.id,
    sourceSlug: sourceSlugByRunId.get(row.run_id) ?? "desconocido",
    errorType: row.error_type,
    bucket: classifyErrorType(row.error_type),
    url,
    urlDisplay,
    message,
    occurredDisplay: formatRelative(row.occurred_at, now),
  };
}

export interface SourceHealth {
  source: SourceRow;
  lastRunAt: string | null;
  successRate: string;
  lastRunDisplay: string;
}

/**
 * For each source, pick the latest 10 runs (by started_at) and compute
 * last-run timestamp + success_rate. Runs with source_id not matching any
 * source are ignored.
 */
export function buildSourceHealth(
  sources: SourceRow[],
  recentRuns: Array<Pick<ScrapeRunRow, "source_id" | "started_at" | "items_errored">>,
  now: Date = new Date()
): SourceHealth[] {
  const runsBySource = new Map<
    number,
    Array<Pick<ScrapeRunRow, "source_id" | "started_at" | "items_errored">>
  >();
  for (const r of recentRuns) {
    const arr = runsBySource.get(r.source_id) ?? [];
    arr.push(r);
    runsBySource.set(r.source_id, arr);
  }
  return sources.map((s) => {
    const runs = (runsBySource.get(s.id) ?? [])
      .slice()
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .slice(0, 10);
    const lastRunAt = runs[0]?.started_at ?? null;
    return {
      source: s,
      lastRunAt,
      successRate: formatSuccessRate(runs),
      lastRunDisplay: formatRelative(lastRunAt, now),
    };
  });
}
