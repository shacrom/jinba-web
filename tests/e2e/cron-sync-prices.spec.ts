import { expect, test } from "@playwright/test";

/**
 * tests/e2e/cron-sync-prices.spec.ts — I07 (data-sources-strategy)
 *
 * Auth-guard smoke tests for GET /api/cron/sync-prices.
 *
 * These two cases do NOT require Apify or Supabase credentials — the handler
 * returns 401 before any downstream call (REQ-TEST-06).
 *
 * Per spec REQ-TEST-08, the handler must NOT fail at build time due to missing
 * env vars. These tests verify the deployed route rejects unauthenticated
 * requests immediately.
 *
 * The SKIP_E2E flag (set in CI without a running dev server) is honoured via
 * the Playwright config — tests are skipped project-wide when set.
 */

const SKIP_E2E = process.env.SKIP_E2E === "true";

test.describe("GET /api/cron/sync-prices — auth guard", () => {
  test.beforeEach((_, testInfo) => {
    if (SKIP_E2E) testInfo.skip();
  });

  test("request without Authorization header → 401", async ({ request }) => {
    const response = await request.get("/api/cron/sync-prices");
    expect(response.status()).toBe(401);
  });

  test("request with wrong Bearer secret → 401", async ({ request }) => {
    const response = await request.get("/api/cron/sync-prices", {
      headers: { authorization: "Bearer wrongsecret" },
    });
    expect(response.status()).toBe(401);
  });
});
