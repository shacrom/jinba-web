import type { APIRoute } from "astro";

/**
 * /api/cron/seed-prices — stub until Batch 2 lands (data-sources-strategy).
 *
 * Vercel cron invokes this monthly per `vercel.json`. The real implementation
 * re-seeds the 5 niche generations (MX-5 NA, 240Z S30, León Mk1, Golf Mk4,
 * A3 8P) from `data/seed-prices.csv` into `ingested_price_points` with
 * `source = 'seed'`. Blocked on jinba-db migration + `types:sync`.
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
      reason: "seed pipeline awaiting jinba-db migration",
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
