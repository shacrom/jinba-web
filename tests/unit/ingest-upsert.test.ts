import type { IngestedPricePoint } from "@/lib/ingest/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Supabase admin mock ────────────────────────────────────────────────────

// mockGenIn is the `.in()` stub on the generations query chain.
const mockGenIn = vi.fn();
const mockUpsertSelect = vi.fn();

let mockSupabaseAdmin: {
  from: ReturnType<typeof vi.fn>;
  rpc: () => unknown;
} | null = null;

vi.mock("@/lib/supabase-admin", () => ({
  get supabaseAdmin() {
    return mockSupabaseAdmin;
  },
  isAdminConfigured: () => mockSupabaseAdmin !== null,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePoint(overrides: Partial<IngestedPricePoint> = {}): IngestedPricePoint {
  return {
    source_slug: "milanuncios",
    gen_slug: "seat:ibiza:mk4",
    external_id: "ext-001",
    year: 2010,
    km: 80000,
    price: 5000,
    currency: "EUR",
    observed_at: "2026-04-23T00:00:00.000Z",
    ...overrides,
  };
}

// Resolved gen-id triple returned by the mock Supabase generations query
const RESOLVED_ROW = {
  id: 1,
  slug: "mk4",
  models: {
    id: 10,
    slug: "ibiza",
    makes: { id: 100, slug: "seat" },
  },
};

/**
 * Set up the mock so resolveGenIds resolves "seat:ibiza:mk4" and upserts work.
 * The mock.from() factory switches on call order: first call = generations
 * query, subsequent calls = ingested_price_points upsert.
 */
function buildAdminMock(
  upsertData: unknown = [{ id: 99 }],
  upsertError: null | { message: string } = null
) {
  mockGenIn.mockResolvedValue({ data: [RESOLVED_ROW], error: null });
  mockUpsertSelect.mockResolvedValue({ data: upsertData, error: upsertError });

  let callCount = 0;
  mockSupabaseAdmin = {
    from: vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        // First call: resolveGenIds → generations
        return {
          select: vi.fn(() => ({ in: mockGenIn })),
        };
      }
      // Subsequent calls: upsert → ingested_price_points
      return {
        upsert: vi.fn(() => ({ select: mockUpsertSelect })),
      };
    }),
    rpc: vi.fn(),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("upsertBatch()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseAdmin = null;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("3 valid rows with resolvable gen_slug → inserted: 3, rejected: 0", async () => {
    buildAdminMock([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const { upsertBatch } = await import("@/lib/ingest/upsert");

    const points = [
      makePoint({ external_id: "a" }),
      makePoint({ external_id: "b" }),
      makePoint({ external_id: "c" }),
    ];
    const result = await upsertBatch(points, "run-1");

    expect(result.inserted).toBe(3);
    expect(result.rejected).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("row with unresolvable gen_slug increments rejected, others are upserted", async () => {
    mockGenIn.mockResolvedValue({ data: [RESOLVED_ROW], error: null });
    mockUpsertSelect.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], error: null });

    let callCount = 0;
    mockSupabaseAdmin = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return { select: vi.fn(() => ({ in: mockGenIn })) };
        }
        return { upsert: vi.fn(() => ({ select: mockUpsertSelect })) };
      }),
      rpc: vi.fn(),
    };

    const { upsertBatch } = await import("@/lib/ingest/upsert");

    const points = [
      makePoint({ external_id: "a", gen_slug: "seat:ibiza:mk4" }),
      makePoint({ external_id: "b", gen_slug: "seat:ibiza:mk4" }),
      makePoint({ external_id: "c", gen_slug: "unknown:gen:slug" }), // unresolvable
    ];
    const result = await upsertBatch(points, "run-2");

    expect(result.rejected).toBe(1);
    expect(result.inserted).toBe(2);
  });

  it("supabase upsert error sets result.error, does not throw", async () => {
    buildAdminMock(null, { message: "DB is down" });
    const { upsertBatch } = await import("@/lib/ingest/upsert");

    const result = await upsertBatch([makePoint()], "run-3");

    expect(result.error).toBe("DB is down");
    expect(typeof result.rejected).toBe("number");
  });

  it("1200-row input is chunked into exactly 3 supabase upsert calls (500+500+200)", async () => {
    const upsertCallSizes: number[] = [];
    const mockUpsertFn = vi.fn((rows: unknown[]) => {
      upsertCallSizes.push(rows.length);
      return { select: vi.fn().mockResolvedValue({ data: rows, error: null }) };
    });

    mockGenIn.mockResolvedValue({ data: [RESOLVED_ROW], error: null });

    let callCount = 0;
    mockSupabaseAdmin = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return { select: vi.fn(() => ({ in: mockGenIn })) };
        }
        return { upsert: mockUpsertFn };
      }),
      rpc: vi.fn(),
    };

    const { upsertBatch } = await import("@/lib/ingest/upsert");

    const points = Array.from({ length: 1200 }, (_, i) => makePoint({ external_id: `ext-${i}` }));
    await upsertBatch(points, "run-4");

    expect(mockUpsertFn).toHaveBeenCalledTimes(3);
    expect(upsertCallSizes[0]).toBe(500);
    expect(upsertCallSizes[1]).toBe(500);
    expect(upsertCallSizes[2]).toBe(200);
  });

  it("all slugs unresolvable → inserted: 0, rejected = input length", async () => {
    mockGenIn.mockResolvedValue({ data: [], error: null });
    mockUpsertSelect.mockResolvedValue({ data: [], error: null });

    let callCount = 0;
    mockSupabaseAdmin = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return { select: vi.fn(() => ({ in: mockGenIn })) };
        }
        return { upsert: vi.fn(() => ({ select: mockUpsertSelect })) };
      }),
      rpc: vi.fn(),
    };

    const { upsertBatch } = await import("@/lib/ingest/upsert");

    const points = [makePoint({ gen_slug: "unknown:a:b" }), makePoint({ gen_slug: "unknown:c:d" })];
    const result = await upsertBatch(points, "run-5");

    expect(result.inserted).toBe(0);
    expect(result.rejected).toBe(2);
  });
});

describe("resolveGenIds()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseAdmin = null;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns empty map when supabaseAdmin is null", async () => {
    mockSupabaseAdmin = null;
    const { resolveGenIds } = await import("@/lib/ingest/upsert");
    const result = await resolveGenIds(["seat:ibiza:mk4"]);
    expect(result.size).toBe(0);
  });

  it("resolves slug correctly from Supabase join response", async () => {
    mockGenIn.mockResolvedValue({ data: [RESOLVED_ROW], error: null });

    mockSupabaseAdmin = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: mockGenIn })),
      })),
      rpc: vi.fn(),
    };

    const { resolveGenIds } = await import("@/lib/ingest/upsert");
    const result = await resolveGenIds(["seat:ibiza:mk4"]);

    expect(result.has("seat:ibiza:mk4")).toBe(true);
    const ids = result.get("seat:ibiza:mk4");
    expect(ids?.generation_id).toBe(1);
    expect(ids?.model_id).toBe(10);
    expect(ids?.make_id).toBe(100);
  });
});
