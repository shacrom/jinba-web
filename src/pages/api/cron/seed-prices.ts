import { seedNichePrices } from "@/lib/ingest/seed";
/**
 * src/pages/api/cron/seed-prices.ts — E02 (data-sources-strategy)
 *
 * Monthly Vercel cron endpoint (0 3 1 * * per vercel.json).
 * Delegates entirely to seedNichePrices() from src/lib/ingest/seed.ts.
 *
 * Auth: same CRON_SECRET bearer check as sync-prices.ts.
 * Returns: 200 JSON SeedResult on success; 401 on auth failure.
 */
import type { APIRoute } from "astro";

export const prerender = false;
export const config = { runtime: "nodejs" };

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const CRON_SECRET = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return unauthorized();
  }

  const result = await seedNichePrices({ dryRun: false });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};

// Block all other methods
const methodNotAllowed: APIRoute = async () => new Response("method not allowed", { status: 405 });
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const PATCH = methodNotAllowed;
