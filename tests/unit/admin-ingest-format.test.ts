import {
  type IngestedPricePointRow,
  aggregateIngestRuns,
  aggregateIngestSources,
} from "@/lib/admin-ingest-format";
import { describe, expect, it } from "vitest";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date("2026-04-23T12:00:00.000Z");

/** Build a minimal IngestedPricePointRow. Only fields used by the aggregators
 *  are required; the rest get sensible defaults so tests stay concise. */
function row(
  overrides: Partial<IngestedPricePointRow> & {
    ingest_run_id: string;
    source_slug: string;
    gen_slug: string;
    observed_at: string;
    created_at: string;
  }
): IngestedPricePointRow {
  return {
    id: 1,
    currency: "EUR",
    external_id: "ext-1",
    generation_id: 1,
    km: null,
    make_id: 1,
    model_id: 1,
    price: 10000,
    year: 2020,
    ...overrides,
  };
}

// ── aggregateIngestRuns ───────────────────────────────────────────────────────

describe("aggregateIngestRuns", () => {
  it("returns empty array for empty input", () => {
    expect(aggregateIngestRuns([], NOW)).toEqual([]);
  });

  it("builds a single summary from one run with 3 rows from 2 sources", () => {
    const rows: IngestedPricePointRow[] = [
      row({
        ingest_run_id: "run-1",
        source_slug: "wallapop",
        gen_slug: "seat:ibiza:mk4",
        observed_at: "2026-04-23T10:00:00Z",
        created_at: "2026-04-23T10:01:00Z",
      }),
      row({
        ingest_run_id: "run-1",
        source_slug: "milanuncios",
        gen_slug: "seat:ibiza:mk4",
        observed_at: "2026-04-23T10:00:00Z",
        created_at: "2026-04-23T10:01:30Z",
      }),
      row({
        ingest_run_id: "run-1",
        source_slug: "milanuncios",
        gen_slug: "vw:polo:mk5",
        observed_at: "2026-04-23T10:00:00Z",
        created_at: "2026-04-23T10:02:00Z",
      }),
    ];
    const summaries = aggregateIngestRuns(rows, NOW);
    expect(summaries).toHaveLength(1);
    // Use [0] with optional access — biome noNonNullAssertion rule.
    expect(summaries[0]?.ingestRunId).toBe("run-1");
    expect(summaries[0]?.rowCount).toBe(3);
    // sourceSlugs must be distinct and sorted alphabetically.
    expect(summaries[0]?.sourceSlugs).toEqual(["milanuncios", "wallapop"]);
    // 2 distinct gen_slugs.
    expect(summaries[0]?.gensTouched).toBe(2);
    expect(summaries[0]?.lastInserted).toBe("2026-04-23T10:02:00Z");
  });

  it("sorts multiple runs by lastInserted descending", () => {
    const rows: IngestedPricePointRow[] = [
      row({
        ingest_run_id: "run-old",
        source_slug: "seed",
        gen_slug: "seat:ibiza:mk4",
        observed_at: "2026-04-20T00:00:00Z",
        created_at: "2026-04-20T00:01:00Z",
      }),
      row({
        ingest_run_id: "run-new",
        source_slug: "seed",
        gen_slug: "seat:ibiza:mk4",
        observed_at: "2026-04-23T00:00:00Z",
        created_at: "2026-04-23T00:01:00Z",
      }),
      row({
        ingest_run_id: "run-mid",
        source_slug: "seed",
        gen_slug: "seat:ibiza:mk4",
        observed_at: "2026-04-21T00:00:00Z",
        created_at: "2026-04-21T00:01:00Z",
      }),
    ];
    const summaries = aggregateIngestRuns(rows, NOW);
    expect(summaries).toHaveLength(3);
    expect(summaries[0]?.ingestRunId).toBe("run-new");
    expect(summaries[1]?.ingestRunId).toBe("run-mid");
    expect(summaries[2]?.ingestRunId).toBe("run-old");
  });

  it("caps output at top 20 runs", () => {
    const rows: IngestedPricePointRow[] = Array.from({ length: 25 }, (_, i) =>
      row({
        ingest_run_id: `run-${String(i).padStart(2, "0")}`,
        source_slug: "seed",
        gen_slug: "seat:ibiza:mk4",
        observed_at: new Date(NOW.getTime() - i * 60_000).toISOString(),
        created_at: new Date(NOW.getTime() - i * 60_000).toISOString(),
      })
    );
    const summaries = aggregateIngestRuns(rows, NOW);
    expect(summaries).toHaveLength(20);
    // Most recent run is run-00 (i=0, subtracted 0ms).
    expect(summaries[0]?.ingestRunId).toBe("run-00");
  });

  it("computes durationMs from first to last created_at within a run", () => {
    const rows: IngestedPricePointRow[] = [
      row({
        ingest_run_id: "run-dur",
        source_slug: "milanuncios",
        gen_slug: "seat:ibiza:mk4",
        observed_at: "2026-04-23T10:00:00Z",
        created_at: "2026-04-23T10:00:00Z",
      }),
      row({
        ingest_run_id: "run-dur",
        source_slug: "milanuncios",
        gen_slug: "seat:ibiza:mk5",
        observed_at: "2026-04-23T10:00:00Z",
        // 30 seconds after the first insert
        created_at: "2026-04-23T10:00:30Z",
      }),
    ];
    const [s] = aggregateIngestRuns(rows, NOW);
    expect(s?.durationMs).toBe(30_000);
  });
});

// ── aggregateIngestSources ────────────────────────────────────────────────────

describe("aggregateIngestSources", () => {
  it("returns empty array for empty input", () => {
    expect(aggregateIngestSources([], NOW)).toEqual([]);
  });

  it("seed source is never stale even with no recent inserts", () => {
    const rows: IngestedPricePointRow[] = [
      row({
        ingest_run_id: "seed-initial",
        source_slug: "seed",
        gen_slug: "seat:ibiza:mk4",
        observed_at: "2026-01-01T00:00:00Z",
        // Very old — over a year ago relative to NOW
        created_at: "2026-01-01T00:00:00Z",
      }),
    ];
    const sources = aggregateIngestSources(rows, NOW);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.sourceSlug).toBe("seed");
    expect(sources[0]?.isStale).toBe(false);
  });

  it("milanuncios with last insert 25 h ago is stale", () => {
    const lastInsert = new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString();
    const rows: IngestedPricePointRow[] = [
      row({
        ingest_run_id: "run-stale",
        source_slug: "milanuncios",
        gen_slug: "seat:ibiza:mk4",
        observed_at: lastInsert,
        created_at: lastInsert,
      }),
    ];
    const sources = aggregateIngestSources(rows, NOW);
    expect(sources[0]?.isStale).toBe(true);
  });

  it("milanuncios with last insert 1 h ago is not stale", () => {
    const lastInsert = new Date(NOW.getTime() - 1 * 60 * 60 * 1000).toISOString();
    const rows: IngestedPricePointRow[] = [
      row({
        ingest_run_id: "run-fresh",
        source_slug: "milanuncios",
        gen_slug: "seat:ibiza:mk4",
        observed_at: lastInsert,
        created_at: lastInsert,
      }),
    ];
    const sources = aggregateIngestSources(rows, NOW);
    expect(sources[0]?.isStale).toBe(false);
  });

  it("computes rows24h and rows7d accurately", () => {
    const h1ago = new Date(NOW.getTime() - 1 * 60 * 60 * 1000).toISOString();
    const h23ago = new Date(NOW.getTime() - 23 * 60 * 60 * 1000).toISOString();
    const h25ago = new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString();
    const d6ago = new Date(NOW.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const d8ago = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

    const rows: IngestedPricePointRow[] = [
      // within 24h
      row({
        ingest_run_id: "r1",
        source_slug: "wallapop",
        gen_slug: "g1",
        observed_at: h1ago,
        created_at: h1ago,
      }),
      row({
        ingest_run_id: "r1",
        source_slug: "wallapop",
        gen_slug: "g1",
        observed_at: h23ago,
        created_at: h23ago,
      }),
      // outside 24h but within 7d
      row({
        ingest_run_id: "r1",
        source_slug: "wallapop",
        gen_slug: "g1",
        observed_at: h25ago,
        created_at: h25ago,
      }),
      row({
        ingest_run_id: "r1",
        source_slug: "wallapop",
        gen_slug: "g1",
        observed_at: d6ago,
        created_at: d6ago,
      }),
      // outside 7d
      row({
        ingest_run_id: "r1",
        source_slug: "wallapop",
        gen_slug: "g1",
        observed_at: d8ago,
        created_at: d8ago,
      }),
    ];
    const sources = aggregateIngestSources(rows, NOW);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.totalRows).toBe(5);
    expect(sources[0]?.rows24h).toBe(2);
    expect(sources[0]?.rows7d).toBe(4);
  });

  it("places seed source last in output", () => {
    const ts = NOW.toISOString();
    const rows: IngestedPricePointRow[] = [
      row({
        ingest_run_id: "r",
        source_slug: "seed",
        gen_slug: "g",
        observed_at: ts,
        created_at: ts,
      }),
      row({
        ingest_run_id: "r",
        source_slug: "wallapop",
        gen_slug: "g",
        observed_at: ts,
        created_at: ts,
      }),
      row({
        ingest_run_id: "r",
        source_slug: "milanuncios",
        gen_slug: "g",
        observed_at: ts,
        created_at: ts,
      }),
    ];
    const sources = aggregateIngestSources(rows, NOW);
    expect(sources).toHaveLength(3);
    expect(sources[0]?.sourceSlug).toBe("milanuncios");
    expect(sources[1]?.sourceSlug).toBe("wallapop");
    expect(sources[2]?.sourceSlug).toBe("seed");
  });
});
