/**
 * price-history.test.ts — M4 T10
 * Tests for getPriceHistory() helper: empty Supabase, errors, mapping.
 * REQ-PH-01, REQ-PH-06.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @/lib/supabase before importing the helper under test. Each test
// replaces the mock's return value via the factory below.
type MockBuilder = {
  select: () => MockBuilder;
  eq: () => MockBuilder;
  gte: () => MockBuilder;
  order: () => Promise<{ data: unknown; error: unknown }>;
};

let mockSupabase: unknown = null;
let mockResponse: { data: unknown; error: unknown } = { data: [], error: null };
let mockThrows = false;

function createBuilder(): MockBuilder {
  const builder: MockBuilder = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    order: async () => {
      if (mockThrows) throw new Error("boom");
      return mockResponse;
    },
  };
  return builder;
}

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

import { getPriceHistory } from "@/lib/price-history";

describe("getPriceHistory", () => {
  beforeEach(() => {
    mockSupabase = null;
    mockResponse = { data: [], error: null };
    mockThrows = false;
  });

  it("returns [] when supabase client is null", async () => {
    mockSupabase = null;
    const out = await getPriceHistory({ generationId: 1 });
    expect(out).toEqual([]);
  });

  it("returns [] when query errors", async () => {
    mockSupabase = { from: () => createBuilder() };
    mockResponse = { data: null, error: { message: "pg error" } };
    const out = await getPriceHistory({ generationId: 1 });
    expect(out).toEqual([]);
  });

  it("returns [] when query throws", async () => {
    mockSupabase = { from: () => createBuilder() };
    mockThrows = true;
    const out = await getPriceHistory({ generationId: 1 });
    expect(out).toEqual([]);
  });

  it("returns [] on empty rows", async () => {
    mockSupabase = { from: () => createBuilder() };
    mockResponse = { data: [], error: null };
    const out = await getPriceHistory({ generationId: 1 });
    expect(out).toEqual([]);
  });

  it("maps MV rows into PricePoints with rounded numbers", async () => {
    mockSupabase = { from: () => createBuilder() };
    mockResponse = {
      data: [
        { date: "2026-01-01", median: 8000.4, p25: 6500.1, p75: 10500.9, count: 12 },
        { date: "2026-01-02", median: 8100, p25: 6600, p75: 10600, count: 14 },
      ],
      error: null,
    };
    const out = await getPriceHistory({ generationId: 42 });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      date: "2026-01-01",
      median: 8000,
      p25: 6500,
      p75: 10501,
      count: 12,
    });
    expect(out[1].median).toBe(8100);
  });

  it("filters out rows with non-string date", async () => {
    mockSupabase = { from: () => createBuilder() };
    mockResponse = {
      data: [
        { date: null, median: 1000, p25: 800, p75: 1200, count: 1 },
        { date: "2026-01-02", median: 2000, p25: 1800, p75: 2200, count: 2 },
      ],
      error: null,
    };
    const out = await getPriceHistory({ generationId: 1 });
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe("2026-01-02");
  });

  it("coerces null numeric fields to 0", async () => {
    mockSupabase = { from: () => createBuilder() };
    mockResponse = {
      data: [
        { date: "2026-01-01", median: null, p25: null, p75: null, count: null },
        { date: "2026-01-02", median: null, p25: null, p75: null, count: null },
        { date: "2026-01-03", median: null, p25: null, p75: null, count: null },
      ],
      error: null,
    };
    const out = await getPriceHistory({ generationId: 1 });
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ date: "2026-01-01", median: 0, p25: 0, p75: 0, count: 0 });
  });
});
