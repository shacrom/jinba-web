import type { APIRoute } from "astro";

/**
 * /api/cron/sync-prices — stub until Batch 2 lands (data-sources-strategy).
 *
 * Vercel cron invokes this every 6h per `vercel.json`. The real implementation
 * pulls Apify datasets, normalises them, and upserts into `ingested_price_points`.
 * That work is blocked on the jinba-db migration + `types:sync`.
 *
 * Until then this handler only validates the bearer secret and returns 503
 * so cron runs are visible in logs without crashing the deploy or producing
 * false-positive 200 reports.
 */
export const prerender = false;

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function notReady(): Response {
  return new Response(
    JSON.stringify({
      status: "not_ready",
      reason: "ingest pipeline awaiting jinba-db migration",
    }),
    {
      status: 503,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "");
  return provided === expected;
}

export const GET: APIRoute = async ({ request }) => {
  if (!authorized(request)) return unauthorized();
  return notReady();
};

export const POST: APIRoute = async ({ request }) => {
  if (!authorized(request)) return unauthorized();
  return notReady();
};
