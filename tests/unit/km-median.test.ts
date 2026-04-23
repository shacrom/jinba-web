import { resolveMedianKmPerYear } from "@/lib/km-median";
import { MEDIAN_KM_PER_YEAR } from "@/lib/price-estimate";
import { describe, expect, it } from "vitest";

/**
 * km-median.test.ts — M5 N-03
 *
 * `resolveMedianKmPerYear` calls the SECURITY DEFINER RPC
 * `get_median_km_per_year(gen_id)` in Supabase. The tests stub the Supabase
 * client via a minimal shape so we don't depend on the real client.
 */

type StubRpcResult = { data: unknown; error: { message: string } | null };

type RpcStub = (name: string, params: Record<string, unknown>) => Promise<StubRpcResult>;

function stubClient(rpc: RpcStub) {
  // Cast to the narrow `SupabaseClient` shape the helper expects.
  return { rpc } as unknown as Parameters<typeof resolveMedianKmPerYear>[1];
}

describe("resolveMedianKmPerYear", () => {
  it("returns the RPC value when the server responds with a positive number", async () => {
    const client = stubClient(async (name, params) => {
      expect(name).toBe("get_median_km_per_year");
      expect(params).toEqual({ gen_id: 42 });
      return { data: 8250, error: null };
    });
    expect(await resolveMedianKmPerYear(42, client)).toBe(8250);
  });

  it("falls back to MEDIAN_KM_PER_YEAR when the client is null", async () => {
    expect(await resolveMedianKmPerYear(42, null)).toBe(MEDIAN_KM_PER_YEAR);
  });

  it("falls back to MEDIAN_KM_PER_YEAR on RPC error", async () => {
    const client = stubClient(async () => ({
      data: null,
      error: { message: "function missing" },
    }));
    expect(await resolveMedianKmPerYear(42, client)).toBe(MEDIAN_KM_PER_YEAR);
  });

  it("falls back when the RPC returns null", async () => {
    const client = stubClient(async () => ({ data: null, error: null }));
    expect(await resolveMedianKmPerYear(42, client)).toBe(MEDIAN_KM_PER_YEAR);
  });

  it("falls back when the RPC returns a non-number shape", async () => {
    const client = stubClient(async () => ({
      data: "not-a-number",
      error: null,
    }));
    expect(await resolveMedianKmPerYear(42, client)).toBe(MEDIAN_KM_PER_YEAR);
  });

  it("falls back when the RPC returns zero or negative", async () => {
    const zero = stubClient(async () => ({ data: 0, error: null }));
    const neg = stubClient(async () => ({ data: -100, error: null }));
    expect(await resolveMedianKmPerYear(42, zero)).toBe(MEDIAN_KM_PER_YEAR);
    expect(await resolveMedianKmPerYear(42, neg)).toBe(MEDIAN_KM_PER_YEAR);
  });

  it("falls back when the RPC throws", async () => {
    const client = stubClient(async () => {
      throw new Error("network dead");
    });
    expect(await resolveMedianKmPerYear(42, client)).toBe(MEDIAN_KM_PER_YEAR);
  });
});
