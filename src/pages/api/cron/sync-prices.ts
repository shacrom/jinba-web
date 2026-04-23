import {
  ApifyAuthError,
  ApifyNetworkError,
  ApifyParseError,
  pullDataset,
} from "@/lib/apify-client";
import { normalize } from "@/lib/ingest/normalize";
import { INGEST_TARGETS } from "@/lib/ingest/targets";
import { IngestedPricePointSchema } from "@/lib/ingest/types";
import { upsertBatch } from "@/lib/ingest/upsert";
import { supabaseAdmin } from "@/lib/supabase-admin";
/**
 * src/pages/api/cron/sync-prices.ts — E01 (data-sources-strategy)
 *
 * Vercel cron endpoint. Invoked every 6 hours per vercel.json.
 * Vercel injects Authorization: Bearer <CRON_SECRET> automatically.
 *
 * Flow:
 *   1. Auth check (CRON_SECRET)
 *   2. Preflight: APIFY_TOKEN + supabaseAdmin must be present
 *   3. For each target in INGEST_TARGETS:
 *      a. pullDataset (with retry + Zod at edge)
 *      b. normalize rows
 *      c. IngestedPricePointSchema second pass (defense in depth)
 *      d. upsertBatch into ingested_price_points
 *   4. refresh_price_aggregates_daily() (non-fatal)
 *   5. Zero-row alert webhook if ALERT_WEBHOOK_URL is set
 *   6. Return 200 JSON summary
 */
import type { APIRoute } from "astro";

export const prerender = false;
export const config = { runtime: "nodejs" };

// ─── Structured logging ────────────────────────────────────────────────────

function log(
  level: "info" | "warn" | "error",
  msg: string,
  meta: Record<string, unknown> = {}
): void {
  const line = JSON.stringify({
    level,
    source: "cron:sync-prices",
    msg,
    ...meta,
    ts: new Date().toISOString(),
  });
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

// ─── Responses ─────────────────────────────────────────────────────────────

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function misconfigured(reason: string): Response {
  return new Response(JSON.stringify({ error: reason }), {
    status: 503,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// ─── GET handler ───────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ request }) => {
  const CRON_SECRET = process.env.CRON_SECRET;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

  // 1. Auth check
  const auth = request.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return unauthorized();
  }

  // 2. Preflight: abort before doing any work if misconfigured
  if (!APIFY_TOKEN) {
    log("error", "misconfigured — APIFY_TOKEN not set");
    return misconfigured("APIFY_TOKEN not configured");
  }
  if (!supabaseAdmin) {
    log("error", "misconfigured — supabaseAdmin is null");
    return misconfigured("supabaseAdmin not configured");
  }

  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const totals = { pulled: 0, upserted: 0, rejected: 0, tuples: 0 };
  const runs: Array<Record<string, unknown>> = [];
  let abortedByAuth = false;

  log("info", "run start", { runId, targetCount: INGEST_TARGETS.length });

  // 3. Iterate targets
  for (const target of INGEST_TARGETS) {
    if (abortedByAuth) break;
    totals.tuples++;

    const tupleStart = Date.now();
    const tupleLog: Record<string, unknown> = {
      gen_slug: target.gen_slug,
      source_slug: target.source_slug,
    };

    try {
      // a. Pull from Apify
      const rows = await pullDataset({ token: APIFY_TOKEN }, { datasetId: target.dataset_id });
      totals.pulled += rows.length;
      tupleLog.pulled = rows.length;

      // b. Normalize
      const normalized = rows.map((r) => normalize(r, target));

      // c. Second Zod pass on normalized shape (defense in depth — T11)
      const valid = normalized.filter((n) => {
        const parsed = IngestedPricePointSchema.safeParse(n);
        return parsed.success;
      });
      const schemaRejects = normalized.length - valid.length;
      if (schemaRejects > 0) {
        log("warn", "normalized rows failed second Zod pass", {
          runId,
          ...tupleLog,
          schemaRejects,
        });
      }

      // d. Upsert
      const upsertResult = await upsertBatch(valid, runId);
      const tupleUpserted = upsertResult.inserted + upsertResult.updated;
      totals.upserted += tupleUpserted;
      totals.rejected += upsertResult.rejected + schemaRejects;

      tupleLog.upserted = tupleUpserted;
      tupleLog.rejected = upsertResult.rejected + schemaRejects;
      tupleLog.durationMs = Date.now() - tupleStart;
      if (upsertResult.error) tupleLog.error = upsertResult.error;

      log("info", "tuple complete", { runId, ...tupleLog });
    } catch (err) {
      tupleLog.durationMs = Date.now() - tupleStart;
      tupleLog.upserted = 0;
      tupleLog.rejected = 0;

      if (err instanceof ApifyAuthError) {
        log("error", "apify auth failed — aborting run", { runId, ...tupleLog });
        tupleLog.error = "ApifyAuthError";
        abortedByAuth = true;
      } else if (err instanceof ApifyParseError) {
        log("error", "apify parse error — >50% row rejects (schema drift)", {
          runId,
          ...tupleLog,
          stats: err.stats,
        });
        tupleLog.error = "ApifyParseError";
        tupleLog.stats = err.stats;
      } else if (err instanceof ApifyNetworkError) {
        log("warn", "apify network error — skipping tuple", {
          runId,
          ...tupleLog,
          cause: String(err.cause ?? err.message),
        });
        tupleLog.error = "ApifyNetworkError";
      } else {
        log("error", "unexpected tuple error", { runId, ...tupleLog, err: String(err) });
        tupleLog.error = String(err);
      }
    }

    runs.push(tupleLog);
  }

  // 4. Refresh MV — non-fatal (REQ-INGEST-06)
  let mvRefreshed = false;
  try {
    const { error } = await supabaseAdmin.rpc("refresh_price_aggregates_daily");
    if (error) {
      log("error", "mv refresh rpc returned error", { runId, error: error.message });
    } else {
      mvRefreshed = true;
      log("info", "mv refreshed", { runId });
    }
  } catch (err) {
    log("error", "mv refresh threw", { runId, err: String(err) });
  }

  // 5. Zero-row alert webhook (REQ-INGEST-07)
  if (totals.upserted === 0 && ALERT_WEBHOOK_URL) {
    log("warn", "ingest_zero_rows — firing alert webhook", { runId });
    try {
      await fetch(ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "ingest_zero_rows",
          timestamp: new Date().toISOString(),
          runId,
        }),
      });
    } catch (err) {
      // Webhook failure must not affect response — REQ-CRON-05
      log("error", "alert webhook failed", { runId, err: String(err) });
    }
  }

  // 6. Structured summary line (REQ-OBS-01)
  const durationMs = Date.now() - startedAt;
  log("info", "run complete", {
    runId,
    ...totals,
    mvRefreshed,
    durationMs,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      runId,
      ...totals,
      mv_refreshed: mvRefreshed,
      durationMs,
      runs,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
};

// Block all other methods (REQ-INGEST-01)
const methodNotAllowed: APIRoute = async () => new Response("method not allowed", { status: 405 });
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const PATCH = methodNotAllowed;
