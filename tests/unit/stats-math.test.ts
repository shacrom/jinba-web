import { aggregateStats } from "@/lib/stats";
/**
 * stats-math.test.ts — T34
 * Tests for aggregateStats() pure math utility.
 */
import { describe, expect, it } from "vitest";

describe("aggregateStats", () => {
  it("returns null for empty array", () => {
    expect(aggregateStats([])).toBeNull();
  });

  it("returns row values for single row with count > 0", () => {
    const result = aggregateStats([{ count: 5, median: 8000, p25: 6000, p75: 10000 }]);
    expect(result).not.toBeNull();
    expect(result?.totalCount).toBe(5);
    expect(result?.median).toBe(8000);
    expect(result?.p25).toBe(6000);
    expect(result?.p75).toBe(10000);
  });

  it("computes weighted average for two rows with different counts", () => {
    const result = aggregateStats([
      { count: 4, median: 6000, p25: 5000, p75: 7000 },
      { count: 6, median: 10000, p25: 8000, p75: 12000 },
    ]);
    expect(result).not.toBeNull();
    expect(result?.totalCount).toBe(10);
    // Weighted median = (4×6000 + 6×10000) / 10 = (24000 + 60000) / 10 = 8400
    expect(result?.median).toBe(8400);
    // Weighted p25 = (4×5000 + 6×8000) / 10 = (20000 + 48000) / 10 = 6800
    expect(result?.p25).toBe(6800);
    // Weighted p75 = (4×7000 + 6×12000) / 10 = (28000 + 72000) / 10 = 10000
    expect(result?.p75).toBe(10000);
  });

  it("returns data even when totalCount < 5 (caller decides display threshold)", () => {
    const result = aggregateStats([{ count: 3, median: 7000, p25: 5500, p75: 9000 }]);
    expect(result).not.toBeNull();
    expect(result?.totalCount).toBe(3);
    expect(result?.median).toBe(7000);
  });

  it("handles null row values by treating them as 0", () => {
    const result = aggregateStats([{ count: 2, median: null, p25: null, p75: null }]);
    expect(result).not.toBeNull();
    expect(result?.median).toBe(0);
  });

  it("rounds results to integers", () => {
    const result = aggregateStats([
      { count: 3, median: 7001, p25: 5001, p75: 9001 },
      { count: 2, median: 6000, p25: 4000, p75: 8000 },
    ]);
    expect(result).not.toBeNull();
    // Weighted: (3×7001 + 2×6000) / 5 = (21003 + 12000) / 5 = 6600.6 → 6601
    expect(result?.median).toBe(6601);
    expect(Number.isInteger(result?.p25)).toBe(true);
    expect(Number.isInteger(result?.p75)).toBe(true);
  });
});
