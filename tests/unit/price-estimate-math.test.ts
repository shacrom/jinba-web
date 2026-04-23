import {
  CONDITION_MODIFIERS,
  MEDIAN_KM_PER_YEAR,
  computeEstimate,
  conditionModifier,
  kmModifier,
  weightedMedian,
} from "@/lib/price-estimate";
import type { MVRow } from "@/lib/price-estimate";
/**
 * price-estimate-math.test.ts — M5
 * Unit tests for the pricing heuristic. REQ-CALC-MATH-01/02/03, REQ-CALC-TEST-01.
 */
import { describe, expect, it } from "vitest";

describe("weightedMedian", () => {
  it("returns null on empty input", () => {
    expect(weightedMedian([])).toBeNull();
  });

  it("weights each row's median by its count", () => {
    const rows: MVRow[] = [
      { count: 10, median: 10_000 },
      { count: 20, median: 12_000 },
      { count: 30, median: 11_000 },
    ];
    // (10000*10 + 12000*20 + 11000*30) / 60 = 670000/60 = 11166.66..
    expect(weightedMedian(rows)).toBe(11_167);
  });

  it("falls back to equal-weighted mean when all counts are zero/null", () => {
    const rows: MVRow[] = [
      { count: 0, median: 10_000 },
      { count: null, median: 12_000 },
    ];
    expect(weightedMedian(rows)).toBe(11_000);
  });

  it("treats null medians as zero", () => {
    const rows: MVRow[] = [
      { count: 10, median: null },
      { count: 10, median: 20_000 },
    ];
    // (0 + 200000)/20 = 10000
    expect(weightedMedian(rows)).toBe(10_000);
  });
});

describe("kmModifier", () => {
  it("returns 0 when km matches expected mileage for the age", () => {
    // 2026 - 2020 = 6 years, expected = 15000*6 = 90000 → delta=0
    expect(kmModifier(90_000, 2020, 2026)).toBe(0);
  });

  it("is negative for high-km cars, positive for low-km cars", () => {
    // year=2020, current=2026, age=6, expected=90000
    // km=180000 → delta=90000 → ratio=6 → raw=-0.18 (within clamp)
    expect(kmModifier(180_000, 2020, 2026)).toBeCloseTo(-0.18, 5);
    // km=0 → delta=-90000 → ratio=-6 → raw=+0.18
    expect(kmModifier(0, 2020, 2026)).toBeCloseTo(0.18, 5);
  });

  it("clamps downward at -0.25 for extreme high km", () => {
    // 1M km vs expected 90k → ratio ≈ 60.67 → raw=-1.82 → clamp to -0.25
    expect(kmModifier(1_000_000, 2020, 2026)).toBe(-0.25);
  });

  it("clamps upward at +0.25 for unrealistically low km", () => {
    // km=0 for a 50-year-old car → expected=750k, delta=-750k,
    // ratio=-50, raw=+1.5 → clamp to +0.25
    expect(kmModifier(0, 1976, 2026)).toBe(0.25);
  });

  it("treats age < 1 year as age = 1 (floor)", () => {
    // year === current year → age=1, expected=15000
    // km=15000 → delta=0 → mod=0
    expect(kmModifier(15_000, 2026, 2026)).toBe(0);
    // Future year (buyer typed next year) → still age=1 via Math.max(1, ...)
    expect(kmModifier(15_000, 2027, 2026)).toBe(0);
  });

  it("defaults currentYear to UTC now when omitted", () => {
    const now = new Date().getUTCFullYear();
    const expected = MEDIAN_KM_PER_YEAR * Math.max(1, now - 2020);
    expect(kmModifier(expected, 2020)).toBe(0);
  });

  // M5 N-03 — per-generation median km/year override
  it("honours a per-gen medianKmPerYear override (lower baseline)", () => {
    // Classic car typical use: 3000 km/year. A 50-year-old car with
    // 150000 km matches expected (3000 × 50 = 150000) → modifier = 0.
    expect(kmModifier(150_000, 1976, 2026, 3000)).toBe(0);
  });

  it("honours a per-gen medianKmPerYear override (higher baseline)", () => {
    // Daily-driver gen: 20000 km/year. 5-year-old with 100000 km → modifier 0.
    expect(kmModifier(100_000, 2021, 2026, 20_000)).toBe(0);
  });

  it("scales the delta with the overridden baseline", () => {
    // medianKmPerYear=5000, year=2010, current=2026 → age=16, expected=80000.
    // km=160000 → delta=80000 → ratio=16 → raw=-0.48 → clamp to -0.25.
    expect(kmModifier(160_000, 2010, 2026, 5000)).toBe(-0.25);
    // km=40000 → delta=-40000 → ratio=-8 → raw=+0.24 (within clamp).
    expect(kmModifier(40_000, 2010, 2026, 5000)).toBeCloseTo(0.24, 5);
  });

  it("falls back to MEDIAN_KM_PER_YEAR when override is omitted", () => {
    // Same call without and with explicit default must match.
    const a = kmModifier(180_000, 2020, 2026);
    const b = kmModifier(180_000, 2020, 2026, MEDIAN_KM_PER_YEAR);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe("conditionModifier", () => {
  it("matches the canonical modifier table", () => {
    expect(conditionModifier("excellent")).toBe(0.1);
    expect(conditionModifier("good")).toBe(0.0);
    expect(conditionModifier("fair")).toBe(-0.1);
    expect(conditionModifier("rough")).toBe(-0.25);
  });

  it("exposes the table as a stable constant", () => {
    expect(CONDITION_MODIFIERS.excellent).toBe(0.1);
    expect(CONDITION_MODIFIERS.rough).toBe(-0.25);
  });
});

describe("computeEstimate", () => {
  it("returns null when there are no rows", () => {
    expect(
      computeEstimate({
        rows: [],
        km: 50_000,
        year: 2020,
        condition: "good",
        windowDays: 90,
      })
    ).toBeNull();
  });

  it("returns a well-formed estimate on populated rows (excellent condition)", () => {
    const rows: MVRow[] = [{ count: 10, median: 10_000 }];
    const res = computeEstimate({
      rows,
      km: 90_000,
      year: 2020,
      condition: "excellent",
      windowDays: 90,
      currentYear: 2026,
    });
    // baseline=10000, km_mod=0, cond=+0.10 → adjusted=11000
    expect(res).not.toBeNull();
    expect(res?.estimate_eur).toBe(11_000);
    expect(res?.range.low).toBe(10_230);
    expect(res?.range.high).toBe(11_770);
    expect(res?.basis.median).toBe(10_000);
    expect(res?.basis.count).toBe(10);
    expect(res?.basis.window_days).toBe(90);
  });

  it("stacks km modifier and rough condition multiplicatively", () => {
    const rows: MVRow[] = [{ count: 5, median: 10_000 }];
    // year=2020, current=2026, age=6, expected=90000, km=180000
    // km_mod=-0.18
    // rough=-0.25
    // adjusted = 10000 * 0.82 * 0.75 = 6150
    const res = computeEstimate({
      rows,
      km: 180_000,
      year: 2020,
      condition: "rough",
      windowDays: 90,
      currentYear: 2026,
    });
    expect(res?.estimate_eur).toBe(6_150);
    // ±7% → low=5720, high=6581 (6150*0.93=5719.5→5720, 6150*1.07=6580.5→6581)
    expect(res?.range.low).toBe(5_720);
    expect(res?.range.high).toBe(6_581);
  });

  it("returns null when the weighted median collapses to zero", () => {
    const rows: MVRow[] = [{ count: 3, median: 0 }];
    const res = computeEstimate({
      rows,
      km: 50_000,
      year: 2020,
      condition: "good",
      windowDays: 90,
    });
    expect(res).toBeNull();
  });

  // M5 N-03 — threads medianKmPerYear through to kmModifier
  it("threads per-gen medianKmPerYear through to kmModifier", () => {
    const rows: MVRow[] = [{ count: 5, median: 8_500 }];
    // Mazda MX-5 NA 1994, 150000 km, baseline 4500 km/year (niche).
    // age=2026-1994=32, expected=4500*32=144000, km=150000 → delta=6000
    // ratio=6000/4500=1.333.., raw=-0.04 (within clamp)
    const resNiche = computeEstimate({
      rows,
      km: 150_000,
      year: 1994,
      condition: "good",
      windowDays: 90,
      currentYear: 2026,
      medianKmPerYear: 4500,
    });
    // Baseline default (15000 km/year) would give a drastically different
    // km_mod because expected=480000 vs 150000 → delta=-330000, ratio≈-22
    // → clamp to +0.25. The override prevents that distortion.
    const resDefault = computeEstimate({
      rows,
      km: 150_000,
      year: 1994,
      condition: "good",
      windowDays: 90,
      currentYear: 2026,
      // no medianKmPerYear override
    });
    if (!resNiche || !resDefault) throw new Error("expected non-null estimates");
    // With the niche baseline we sit essentially at the median; with the
    // default baseline we clamp to the maximum low-km bonus.
    expect(Math.abs(resNiche.estimate_eur - 8500)).toBeLessThan(resDefault.estimate_eur - 8500);
  });
});
