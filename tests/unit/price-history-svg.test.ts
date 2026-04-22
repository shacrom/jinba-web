/**
 * price-history-svg.test.ts — M4 T11
 * Tests for niceStep() + buildPriceHistorySVG() pure path builder.
 * REQ-PH-02.
 */
import type { PricePoint } from "@/lib/price-history";
import { buildPriceHistorySVG, niceStep } from "@/lib/price-history-svg";
import { describe, expect, it } from "vitest";

const opts = {
  width: 800,
  height: 240,
  padding: { top: 16, right: 24, bottom: 36, left: 60 },
};

function makePoints(n: number, seed = 1000): PricePoint[] {
  const out: PricePoint[] = [];
  const base = new Date("2026-01-01").getTime();
  for (let i = 0; i < n; i++) {
    out.push({
      date: new Date(base + i * 86400000).toISOString().slice(0, 10),
      median: seed + i * 50,
      p25: seed - 200 + i * 50,
      p75: seed + 200 + i * 50,
      count: 10,
    });
  }
  return out;
}

describe("niceStep", () => {
  it("returns 500 for zero/negative range", () => {
    expect(niceStep(0)).toBe(500);
    expect(niceStep(-100)).toBe(500);
  });

  it("returns 100 for small range under 2000", () => {
    expect(niceStep(1500)).toBe(100);
  });

  it("returns 500 for mid range around 4000", () => {
    expect(niceStep(4000)).toBe(500);
  });

  it("returns 1000 for range around 8000", () => {
    expect(niceStep(8000)).toBe(1000);
  });

  it("scales up for large ranges", () => {
    expect(niceStep(80000)).toBe(10000);
  });
});

describe("buildPriceHistorySVG", () => {
  it("returns null for empty input", () => {
    expect(buildPriceHistorySVG([], opts)).toBeNull();
  });

  it("returns null when fewer than 3 points", () => {
    expect(buildPriceHistorySVG(makePoints(2), opts)).toBeNull();
  });

  it("returns valid chart geometry with 3 points", () => {
    const geo = buildPriceHistorySVG(makePoints(3), opts);
    expect(geo).not.toBeNull();
    if (!geo) return;
    expect(geo.medianPath.startsWith("M")).toBe(true);
    expect(geo.medianPath).toContain("L");
    expect(geo.bandPath.startsWith("M")).toBe(true);
    expect(geo.bandPath.endsWith("Z")).toBe(true);
    expect(geo.xTicks).toHaveLength(2); // sparse: first + last only
    expect(geo.yTicks).toHaveLength(3);
  });

  it("emits 3 x-ticks when points.length >= 7", () => {
    const geo = buildPriceHistorySVG(makePoints(10), opts);
    expect(geo).not.toBeNull();
    if (!geo) return;
    expect(geo.xTicks).toHaveLength(3);
  });

  it("computes inner dimensions correctly", () => {
    const geo = buildPriceHistorySVG(makePoints(5), opts);
    expect(geo).not.toBeNull();
    if (!geo) return;
    expect(geo.innerWidth).toBe(800 - 60 - 24);
    expect(geo.innerHeight).toBe(240 - 16 - 36);
  });

  it("rounds y-range outward to nice values", () => {
    const geo = buildPriceHistorySVG(makePoints(5, 5000), opts);
    expect(geo).not.toBeNull();
    if (!geo) return;
    // p25 ranges 4800..5000, p75 ranges 5200..5400 → nice step kicks in
    expect(geo.minY).toBeLessThanOrEqual(4800);
    expect(geo.maxY).toBeGreaterThanOrEqual(5400);
  });

  it("detects trend up when last median exceeds first by > 2%", () => {
    const points: PricePoint[] = [
      { date: "2026-01-01", median: 10000, p25: 9000, p75: 11000, count: 10 },
      { date: "2026-01-10", median: 10500, p25: 9500, p75: 11500, count: 10 },
      { date: "2026-01-20", median: 12000, p25: 11000, p75: 13000, count: 10 },
    ];
    const geo = buildPriceHistorySVG(points, opts);
    expect(geo?.summary.direction).toBe("up");
  });

  it("detects trend down when last median is < 98% of first", () => {
    const points: PricePoint[] = [
      { date: "2026-01-01", median: 12000, p25: 11000, p75: 13000, count: 10 },
      { date: "2026-01-10", median: 11000, p25: 10000, p75: 12000, count: 10 },
      { date: "2026-01-20", median: 10000, p25: 9000, p75: 11000, count: 10 },
    ];
    const geo = buildPriceHistorySVG(points, opts);
    expect(geo?.summary.direction).toBe("down");
  });

  it("detects trend flat when change is < 2%", () => {
    const points: PricePoint[] = [
      { date: "2026-01-01", median: 10000, p25: 9000, p75: 11000, count: 10 },
      { date: "2026-01-10", median: 10050, p25: 9050, p75: 11050, count: 10 },
      { date: "2026-01-20", median: 10100, p25: 9100, p75: 11100, count: 10 },
    ];
    const geo = buildPriceHistorySVG(points, opts);
    expect(geo?.summary.direction).toBe("flat");
  });

  it("maps x-coordinates to the padded range", () => {
    const geo = buildPriceHistorySVG(makePoints(3), opts);
    expect(geo).not.toBeNull();
    if (!geo) return;
    // First tick x should equal padding.left; last tick x should equal width - padding.right
    expect(geo.xTicks[0].x).toBeCloseTo(60, 1);
    expect(geo.xTicks[geo.xTicks.length - 1].x).toBeCloseTo(800 - 24, 1);
  });

  it("median path contains one segment per point", () => {
    const geo = buildPriceHistorySVG(makePoints(5), opts);
    expect(geo).not.toBeNull();
    if (!geo) return;
    const moves = geo.medianPath.match(/[ML]/g) ?? [];
    expect(moves).toHaveLength(5);
  });
});
