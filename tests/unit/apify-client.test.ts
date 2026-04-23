import {
  ApifyAuthError,
  ApifyNetworkError,
  ApifyParseError,
  pullDataset,
} from "@/lib/apify-client";
/**
 * tests/unit/apify-client.test.ts — I03 (data-sources-strategy)
 *
 * Vitest unit tests for pullDataset() in src/lib/apify-client.ts.
 * Uses vi.stubGlobal("fetch", ...) to mock HTTP responses.
 * REQ-TEST-01, design §8.1 "apify-client.test.ts".
 *
 * 8 cases covering: single-page pull, pagination, 401 auth error,
 * 5xx retry-then-success, 5xx retry-then-fail, >50% Zod rejection,
 * <=50% Zod rejection (drop-and-continue), and AbortController timeout.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const CFG = { token: "test-token", baseUrl: "https://api.apify.test/v2", timeoutMs: 1000 };
const DATASET = "dataset-abc";

/** Build a minimal valid ApifyListing payload */
function validRow(override: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    url: "https://www.milanuncios.com/coches/ibiza-1.htm",
    external_id: "ibiza-1",
    price: 5000,
    currency: "EUR",
    year: 2005,
    km: 80000,
    observed_at: "2026-04-01T00:00:00Z",
    ...override,
  };
}

/** A fetch stub that returns a JSON body with the given status */
function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pullDataset()", () => {
  it("single-page pull returns parsed ApifyListing array", async () => {
    vi.stubGlobal("fetch", mockFetch([validRow()]));
    const result = await pullDataset(CFG, { datasetId: DATASET });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].external_id).toBe("ibiza-1");
  });

  it("paginates: calls fetch twice when first page fills the limit", async () => {
    const limit = 2;
    const page1 = [validRow({ external_id: "a" }), validRow({ external_id: "b" })];
    const page2 = [validRow({ external_id: "c" })];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page1 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page2 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await pullDataset(CFG, { datasetId: DATASET, limit });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(3);
  });

  it("401 response throws ApifyAuthError", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 401));
    await expect(pullDataset(CFG, { datasetId: DATASET })).rejects.toThrow(ApifyAuthError);
  });

  it("5xx retries once: first 503 then 200 success → returns data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [validRow()],
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await pullDataset(CFG, { datasetId: DATASET });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });

  it("5xx retries once: both attempts 503 → throws ApifyNetworkError", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(pullDataset(CFG, { datasetId: DATASET })).rejects.toThrow(ApifyNetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it(">50% Zod rejects throws ApifyParseError with correct stats", async () => {
    // 10 rows, 6 with invalid schema (missing price)
    const page = [
      ...Array.from({ length: 4 }, () => validRow()),
      ...Array.from({ length: 6 }, () => ({ url: "https://x.com", external_id: "x" })),
    ];
    vi.stubGlobal("fetch", mockFetch(page));

    try {
      await pullDataset(CFG, { datasetId: DATASET });
      expect.fail("should have thrown ApifyParseError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApifyParseError);
      const parseErr = err as ApifyParseError;
      expect(parseErr.stats.total).toBe(10);
      expect(parseErr.stats.rejected).toBeGreaterThanOrEqual(6);
    }
  });

  it("<=50% Zod rejects: valid rows returned, invalid dropped, no throw", async () => {
    // 10 rows, 4 invalid (40% rejection — under threshold)
    const page = [
      ...Array.from({ length: 6 }, (_, i) => validRow({ external_id: `valid-${i}` })),
      ...Array.from({ length: 4 }, () => ({ url: "https://x.com", external_id: "x" })),
    ];
    vi.stubGlobal("fetch", mockFetch(page));

    const result = await pullDataset(CFG, { datasetId: DATASET });
    expect(result).toHaveLength(6);
  });

  it("AbortController timeout maps to ApifyNetworkError", async () => {
    // Simulate fetch that never resolves so AbortController fires immediately
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          // Listen for abort signal and reject
          if (init.signal) {
            (init.signal as AbortSignal).addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    // Use a very short timeout so the abort fires quickly
    await expect(pullDataset({ ...CFG, timeoutMs: 1 }, { datasetId: DATASET })).rejects.toThrow(
      ApifyNetworkError
    );
  });
});
