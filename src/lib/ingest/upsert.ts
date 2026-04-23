/**
 * src/lib/ingest/upsert.ts — D04 (data-sources-strategy)
 *
 * Writes normalised IngestedPricePoint rows to `ingested_price_points`.
 * Uses the service-role client to bypass RLS (deny-all for anon).
 *
 * Design decisions:
 * - resolveGenIds does one JOIN query per batch to get make_id/model_id/generation_id
 *   from a gen_slug (e.g. "seat:ibiza:mk4"). Slug format is "make:model:gen".
 * - Chunks of 500 keep each upsert payload under Postgrest limits.
 * - Upsert conflict key: (source_slug, external_id, observed_at::date) — matches
 *   the DB unique constraint from the jinba-db migration.
 * - Returns UpsertResult; never throws for row-level errors.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@/types/database";
import type { IngestedPricePoint } from "./types";

type GenRow = Database["public"]["Tables"]["generations"]["Row"] & {
  models: {
    id: number;
    slug: string;
    makes: {
      id: number;
      slug: string;
    };
  };
};

export interface UpsertResult {
  inserted: number;
  updated: number;
  rejected: number; // rows dropped (unknown gen_slug or validation miss)
  error?: string; // set on a fatal DB error; function does not throw
}

const CHUNK_SIZE = 500;

/**
 * Resolves a list of gen_slugs (format "make:model:gen") to their
 * { make_id, model_id, generation_id } triples via a single joined query.
 *
 * Unknown slugs are silently absent from the returned Map — callers count
 * them as rejected.
 */
export async function resolveGenIds(
  slugs: string[]
): Promise<Map<string, { make_id: number; model_id: number; generation_id: number }>> {
  const result = new Map<string, { make_id: number; model_id: number; generation_id: number }>();

  if (!supabaseAdmin || slugs.length === 0) return result;

  // Deduplicate slugs to avoid redundant rows in the query result
  const unique = [...new Set(slugs)];

  // Extract gen-level slugs (last segment) for the query filter.
  // Slug format: "make_slug:model_slug:gen_slug"
  const genSlugs = unique.map((s) => s.split(":")[2]).filter(Boolean);

  const { data, error } = await supabaseAdmin
    .from("generations")
    .select("id, slug, models!inner(id, slug, makes!inner(id, slug))")
    .in("slug", genSlugs);

  if (error || !data) return result;

  for (const row of data as unknown as GenRow[]) {
    const fullSlug = `${row.models.makes.slug}:${row.models.slug}:${row.slug}`;
    result.set(fullSlug, {
      make_id: row.models.makes.id,
      model_id: row.models.id,
      generation_id: row.id,
    });
  }

  return result;
}

/**
 * Upsert a batch of IngestedPricePoint rows into `ingested_price_points`.
 * Resolves gen_slugs once then writes in chunks of 500.
 *
 * @param points - Normalized + Zod-validated rows ready for the DB.
 * @param runId  - UUID string identifying this ingest run (for audit).
 * @returns UpsertResult with counts; never throws.
 */
export async function upsertBatch(
  points: IngestedPricePoint[],
  runId: string
): Promise<UpsertResult> {
  const result: UpsertResult = { inserted: 0, updated: 0, rejected: 0 };

  if (!supabaseAdmin) {
    result.error = "supabaseAdmin is null — SUPABASE_SERVICE_ROLE_KEY not configured";
    return result;
  }

  if (points.length === 0) return result;

  // Resolve all gen_slugs in one query
  const allSlugs = [...new Set(points.map((p) => p.gen_slug))];
  const idMap = await resolveGenIds(allSlugs);

  // Partition rows into resolvable vs rejected
  type InsertRow = Database["public"]["Tables"]["ingested_price_points"]["Insert"];
  const rows: InsertRow[] = [];

  for (const point of points) {
    const ids = idMap.get(point.gen_slug);
    if (!ids) {
      result.rejected++;
      continue;
    }
    rows.push({
      source_slug: point.source_slug,
      gen_slug: point.gen_slug,
      external_id: point.external_id,
      year: point.year,
      km: point.km ?? null,
      price: point.price,
      currency: point.currency,
      observed_at: point.observed_at,
      ingest_run_id: runId,
      generation_id: ids.generation_id,
      model_id: ids.model_id,
      make_id: ids.make_id,
    });
  }

  // Chunk into batches of 500
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabaseAdmin
      .from("ingested_price_points")
      .upsert(chunk, {
        onConflict: "source_slug,external_id,observed_at",
        ignoreDuplicates: false,
      })
      .select("id");

    if (error) {
      result.error = error.message;
      // Non-fatal: count remaining as rejected and continue
      result.rejected += chunk.length;
      continue;
    }

    // Supabase upsert with select returns all affected rows (insert + update).
    // We report all as inserted since we can't differentiate without a
    // returning clause comparison — the count is what callers need.
    result.inserted += data?.length ?? chunk.length;
  }

  return result;
}
