import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Auth-guard tests for both cron handlers.
 *
 * These tests verify the 401 contract is intact on the REAL handlers
 * (replaced in Batch 2). The 503 "not_ready" assertions from the old stub
 * tests are removed — the real handlers return 503 only on misconfiguration,
 * not on valid auth.
 *
 * The happy-path (200) cases live in tests/unit/ingest-upsert.test.ts and
 * tests/unit/ingest-seed.test.ts (unit) and
 * tests/e2e/cron-sync-prices.spec.ts (e2e).
 */

// Mock heavy deps so the handlers can be imported without real credentials.
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: null,
  isAdminConfigured: () => false,
}));
vi.mock("@/lib/ingest/targets", () => ({ INGEST_TARGETS: [] }));
vi.mock("@/lib/ingest/seed", () => ({
  seedNichePrices: vi.fn().mockResolvedValue({
    inserted: 0,
    updated: 0,
    rejected: 0,
    mv_refreshed: false,
    dryRun: false,
  }),
}));

const makeRequest = (headers: Record<string, string> = {}) =>
  new Request("https://example.test/api/cron/sync-prices", {
    method: "GET",
    headers,
  });

async function loadRoute(path: "sync-prices" | "seed-prices") {
  return await import(`../../src/pages/api/cron/${path}.ts`);
}

const fakeContext = (request: Request) =>
  ({
    request,
    cookies: {},
    url: new URL(request.url),
    params: {},
    redirect: () => new Response(),
  }) as unknown as Parameters<Awaited<ReturnType<typeof loadRoute>>["GET"]>[0];

describe("cron handlers — auth guard contract", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  for (const route of ["sync-prices", "seed-prices"] as const) {
    describe(`/api/cron/${route}`, () => {
      it("returns 401 when CRON_SECRET is unset", async () => {
        vi.stubEnv("CRON_SECRET", "");
        const mod = await loadRoute(route);
        const res = await mod.GET(fakeContext(makeRequest({ authorization: "Bearer whatever" })));
        expect(res.status).toBe(401);
      });

      it("returns 401 when bearer token does not match", async () => {
        vi.stubEnv("CRON_SECRET", "expected-secret");
        const mod = await loadRoute(route);
        const res = await mod.GET(fakeContext(makeRequest({ authorization: "Bearer wrong" })));
        expect(res.status).toBe(401);
      });

      it("returns 401 when authorization header is missing", async () => {
        vi.stubEnv("CRON_SECRET", "expected-secret");
        const mod = await loadRoute(route);
        const res = await mod.GET(fakeContext(makeRequest()));
        expect(res.status).toBe(401);
      });

      it("returns 401 body with { error: 'unauthorized' }", async () => {
        vi.stubEnv("CRON_SECRET", "expected-secret");
        const mod = await loadRoute(route);
        const res = await mod.GET(fakeContext(makeRequest({ authorization: "Bearer bad" })));
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe("unauthorized");
      });
    });
  }
});
