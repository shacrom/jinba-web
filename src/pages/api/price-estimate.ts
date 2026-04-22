import { type MVRow, computeEstimate } from "@/lib/price-estimate";
import { PriceEstimateRequest, type PriceEstimateResponse } from "@/lib/price-estimate-types";
import { supabase } from "@/lib/supabase";
/**
 * POST /api/price-estimate — M5
 * SSR endpoint for the fair-price calculator.
 *
 * - Validates the request body with Zod.
 * - Resolves (make, model, gen) slugs to IDs via the anon Supabase client.
 * - Queries `price_aggregates_daily` for the last 90 days filtered by
 *   make_id + model_id + generation_id + currency='EUR'.
 * - Delegates the math to the pure `computeEstimate` module.
 * - Responds with `{ available: true, estimate_eur, range, basis }` or
 *   `{ available: false }` when no rows are found / the MV is empty /
 *   Supabase env vars are missing.
 *
 * REQ-CALC-ENDPOINT-01, REQ-CALC-ENDPOINT-02, REQ-CALC-MATH-*.
 */
import type { APIRoute } from "astro";

export const prerender = false;

const WINDOW_DAYS = 90;

function json<T>(status: number, body: T): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  // 1. Parse JSON body
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(400, {
      error: "validation_failed",
      details: [{ message: "invalid JSON" }],
    });
  }

  // 2. Validate shape with Zod
  const parsed = PriceEstimateRequest.safeParse(raw);
  if (!parsed.success) {
    return json(400, {
      error: "validation_failed",
      details: parsed.error.issues,
    });
  }
  const { make, model, gen, year, km, condition, currency } = parsed.data;

  // 3. No DB → no estimate (CI / missing env)
  if (!supabase) {
    return json<PriceEstimateResponse>(200, { available: false });
  }

  try {
    // 4. Resolve slugs → IDs in a single query (anon-readable tables)
    const { data: genRow, error: genErr } = await supabase
      .from("generations")
      .select("id, model_id, models!inner(id, slug, makes!inner(id, slug))")
      .eq("slug", gen)
      .limit(1)
      .maybeSingle();

    if (genErr || !genRow) {
      return json<PriceEstimateResponse>(200, { available: false });
    }

    const g = genRow as unknown as {
      id: number;
      model_id: number;
      models: { id: number; slug: string; makes: { id: number; slug: string } };
    };

    // Cross-check slug hierarchy — prevents users from computing against a
    // generation that doesn't belong to the make/model they claim.
    if (g.models.slug !== model || g.models.makes.slug !== make) {
      return json<PriceEstimateResponse>(200, { available: false });
    }

    // 5. Query MV over the last 90 days
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const { data: rows, error: mvErr } = await supabase
      .from("price_aggregates_daily")
      .select("count, median")
      .eq("make_id", g.models.makes.id)
      .eq("model_id", g.models.id)
      .eq("generation_id", g.id)
      .eq("currency", currency)
      .gte("date", since);

    if (mvErr) {
      return json<PriceEstimateResponse>(200, { available: false });
    }

    const mvRows: MVRow[] = (rows ?? []).map((r) => ({
      count: r.count ?? 0,
      median: r.median ?? 0,
    }));

    // 6. Delegate to pure math
    const result = computeEstimate({
      rows: mvRows,
      km,
      year,
      condition,
      windowDays: WINDOW_DAYS,
    });
    if (!result) {
      return json<PriceEstimateResponse>(200, { available: false });
    }

    return json<PriceEstimateResponse>(200, { available: true, ...result });
  } catch {
    return json(500, { error: "server_error" });
  }
};

const methodNotAllowed: APIRoute = async () => json(405, { error: "method_not_allowed" });

export const GET: APIRoute = methodNotAllowed;
export const PUT: APIRoute = methodNotAllowed;
export const DELETE: APIRoute = methodNotAllowed;
export const PATCH: APIRoute = methodNotAllowed;
