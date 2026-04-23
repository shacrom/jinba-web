import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock supabase-admin ─────────────────────────────────────────────────────

const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
let mockSupabaseAdmin: { from: () => unknown; rpc: typeof mockRpc } | null = null;

vi.mock("@/lib/supabase-admin", () => ({
  get supabaseAdmin() {
    return mockSupabaseAdmin;
  },
  isAdminConfigured: () => mockSupabaseAdmin !== null,
}));

// ─── Mock upsert module ──────────────────────────────────────────────────────

const mockUpsertBatch = vi.fn().mockResolvedValue({ inserted: 14, updated: 0, rejected: 0 });
const mockResolveGenIds = vi.fn();

vi.mock("@/lib/ingest/upsert", () => ({
  upsertBatch: (...args: unknown[]) => mockUpsertBatch(...args),
  resolveGenIds: (...args: unknown[]) => mockResolveGenIds(...args),
}));

// ─── Mock fs / readline to serve fixture CSV ────────────────────────────────
//
// The seed module reads data/seed-prices.csv via node:fs createReadStream +
// node:readline createInterface. We intercept createReadStream and return
// a fake Readable that emits the fixture lines.

import { Readable } from "node:stream";

const FIXTURE_CSV = `gen_slug,year,km_p50,price_p50,observed_at
mazda:mx-5:na,1992,150000,8500,2026-04-23T00:00:00.000Z
mazda:mx-5:na,1995,140000,9200,2026-04-23T00:00:00.000Z
seat:leon:mk1,2001,180000,2800,2026-04-23T00:00:00.000Z
volkswagen:golf:mk4,1999,200000,2500,2026-04-23T00:00:00.000Z
audi:a3:8p,2004,180000,4500,2026-04-23T00:00:00.000Z`;

// Build a valid gen-id map for all slugs in the fixture
function buildIdMap(slugs: string[]) {
  const map = new Map<string, { make_id: number; model_id: number; generation_id: number }>();
  slugs.forEach((slug, i) => {
    map.set(slug, { make_id: i + 1, model_id: i + 10, generation_id: i + 100 });
  });
  return map;
}

function makeReadable(content: string): Readable {
  return Readable.from([content]);
}

vi.mock("node:fs", async (importActual) => {
  const actual = await importActual<typeof import("node:fs")>();
  return {
    ...actual,
    createReadStream: vi.fn(() => makeReadable(FIXTURE_CSV)),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FIXTURE_SLUGS = ["mazda:mx-5:na", "seat:leon:mk1", "volkswagen:golf:mk4", "audi:a3:8p"];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("seedNichePrices()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockUpsertBatch.mockResolvedValue({ inserted: 5, updated: 0, rejected: 0 });
    mockResolveGenIds.mockResolvedValue(buildIdMap(FIXTURE_SLUGS));
    mockSupabaseAdmin = {
      from: vi.fn(),
      rpc: mockRpc,
    };
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("dry-run: supabaseAdmin.rpc is never called, result.dryRun is true, inserted is 0", async () => {
    const { seedNichePrices } = await import("@/lib/ingest/seed");
    const result = await seedNichePrices({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.inserted).toBe(0);
    // upsertBatch should NOT be called in dry-run mode
    expect(mockUpsertBatch).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("dry-run: correct row count from fixture CSV is reflected in logs (not in DB)", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { seedNichePrices } = await import("@/lib/ingest/seed");
    await seedNichePrices({ dryRun: true });

    // At least one console.log call should mention the row count
    const calls = consoleSpy.mock.calls.map((c) => c[0]);
    const hasDryRunLog = calls.some((c) => {
      try {
        const parsed = JSON.parse(c);
        return typeof parsed.count === "number" && parsed.count > 0;
      } catch {
        return false;
      }
    });
    expect(hasDryRunLog).toBe(true);
    consoleSpy.mockRestore();
  });

  it("live run: upsertBatch and rpc are called once each, mv_refreshed is true", async () => {
    const { seedNichePrices } = await import("@/lib/ingest/seed");
    const result = await seedNichePrices({ dryRun: false });

    expect(mockUpsertBatch).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("refresh_price_aggregates_daily");
    expect(result.mv_refreshed).toBe(true);
    expect(result.dryRun).toBe(false);
  });

  it("unresolvable slug causes rejected count and upsertBatch is NOT called", async () => {
    // resolveGenIds returns a map that's missing all slugs (empty)
    mockResolveGenIds.mockResolvedValue(new Map());

    const { seedNichePrices } = await import("@/lib/ingest/seed");
    const result = await seedNichePrices({ dryRun: false });

    expect(result.rejected).toBeGreaterThan(0);
    expect(mockUpsertBatch).not.toHaveBeenCalled();
    expect(result.error).toBeTruthy();
  });

  it("rpc failure is non-fatal: function returns normally, mv_refreshed is false", async () => {
    mockRpc.mockRejectedValue(new Error("network error"));

    const { seedNichePrices } = await import("@/lib/ingest/seed");
    // Should not throw
    const result = await seedNichePrices({ dryRun: false });

    expect(result.mv_refreshed).toBe(false);
    // inserted still reported from upsertBatch mock
    expect(result.inserted).toBeGreaterThanOrEqual(0);
  });

  it("re-run uses same external_id values (idempotency call shape)", async () => {
    const { seedNichePrices } = await import("@/lib/ingest/seed");

    await seedNichePrices({ dryRun: false });
    const firstCallArgs = mockUpsertBatch.mock.calls[0]?.[0] as Array<{
      external_id: string;
    }>;
    const firstExtIds = firstCallArgs.map((r) => r.external_id).sort();

    vi.clearAllMocks();
    mockUpsertBatch.mockResolvedValue({ inserted: 5, updated: 0, rejected: 0 });
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockResolveGenIds.mockResolvedValue(buildIdMap(FIXTURE_SLUGS));

    await seedNichePrices({ dryRun: false });
    const secondCallArgs = mockUpsertBatch.mock.calls[0]?.[0] as Array<{
      external_id: string;
    }>;
    const secondExtIds = secondCallArgs.map((r) => r.external_id).sort();

    expect(firstExtIds).toEqual(secondExtIds);
  });
});
