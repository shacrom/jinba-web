import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Stub cron endpoints return 401 without a bearer token and 503 with a
 * valid one. Real logic lands in Batch 2 of data-sources-strategy.
 */

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

describe("cron stubs — auth + not-ready contract", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

      it("returns 503 not_ready when bearer matches", async () => {
        vi.stubEnv("CRON_SECRET", "expected-secret");
        const mod = await loadRoute(route);
        const res = await mod.GET(
          fakeContext(makeRequest({ authorization: "Bearer expected-secret" }))
        );
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.status).toBe("not_ready");
      });

      it("POST path honours the same auth contract", async () => {
        vi.stubEnv("CRON_SECRET", "expected-secret");
        const mod = await loadRoute(route);
        const res = await mod.POST(
          fakeContext(makeRequest({ authorization: "Bearer expected-secret" }))
        );
        expect(res.status).toBe(503);
      });
    });
  }
});
