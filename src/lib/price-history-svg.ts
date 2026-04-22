/**
 * price-history-svg.ts — M4
 * Pure SVG path builder: maps PricePoint[] to chart geometry at build time.
 * No DOM, no browser APIs, no Astro — fully unit-testable.
 * REQ-PH-02.
 */
import type { PricePoint } from "@/lib/price-history";

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartOptions {
  width: number;
  height: number;
  padding: ChartPadding;
}

export interface ChartGeometry {
  medianPath: string;
  bandPath: string;
  xTicks: Array<{ x: number; label: string; rawDate: string }>;
  yTicks: Array<{ y: number; value: number }>;
  minY: number;
  maxY: number;
  innerWidth: number;
  innerHeight: number;
  summary: {
    first: PricePoint;
    last: PricePoint;
    min: number;
    max: number;
    direction: "up" | "down" | "flat";
  };
}

/**
 * Rounds a numeric range to a "nice" step size so axis labels look sensible.
 * For a range R, returns the largest "clean" step in {1, 5, 10} × 10^n that
 * divides R into ~5 ticks.
 */
export function niceStep(range: number): number {
  if (range <= 0) return 500;
  const pow = Math.floor(Math.log10(range));
  const base = range / 10 ** pow;
  // base ∈ [1, 10)
  if (base <= 2) return 1 * 10 ** (pow - 1);
  if (base <= 5) return 5 * 10 ** (pow - 1);
  return 1 * 10 ** pow;
}

/**
 * Computes all SVG paths and tick positions for a price-history chart.
 * Returns null when the dataset is too sparse to show a meaningful trend.
 * REQ-PH-02.
 */
export function buildPriceHistorySVG(
  points: PricePoint[],
  opts: ChartOptions
): ChartGeometry | null {
  if (points.length < 3) return null;

  const innerWidth = opts.width - opts.padding.left - opts.padding.right;
  const innerHeight = opts.height - opts.padding.top - opts.padding.bottom;

  const firstTs = new Date(points[0].date).getTime();
  const lastTs = new Date(points[points.length - 1].date).getTime();
  const tsRange = Math.max(lastTs - firstTs, 1);

  // Y scale: from min(p25) to max(p75), expanded outward to "nice" values.
  const rawMinY = Math.min(...points.map((p) => p.p25));
  const rawMaxY = Math.max(...points.map((p) => p.p75));
  const yRange = Math.max(rawMaxY - rawMinY, 1);
  const step = niceStep(yRange);
  const minY = Math.max(0, Math.floor(rawMinY / step) * step);
  const maxY = Math.ceil(rawMaxY / step) * step;
  const adjYRange = Math.max(maxY - minY, 1);

  const xOf = (date: string): number =>
    opts.padding.left + ((new Date(date).getTime() - firstTs) / tsRange) * innerWidth;
  const yOf = (v: number): number =>
    opts.padding.top + innerHeight - ((v - minY) / adjYRange) * innerHeight;

  // Median line path.
  const medianPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.date).toFixed(1)},${yOf(p.median).toFixed(1)}`)
    .join(" ");

  // Band (p25–p75) closed polygon: p75 forward, then p25 reverse.
  const p75Segs = points.map(
    (p, i) => `${i === 0 ? "M" : "L"}${xOf(p.date).toFixed(1)},${yOf(p.p75).toFixed(1)}`
  );
  const p25Segs = points
    .slice()
    .reverse()
    .map((p) => `L${xOf(p.date).toFixed(1)},${yOf(p.p25).toFixed(1)}`);
  const bandPath = [...p75Segs, ...p25Segs, "Z"].join(" ");

  // X ticks: 2 (sparse) or 3 (dense) entries.
  const xTicks: ChartGeometry["xTicks"] = [
    { x: xOf(points[0].date), label: points[0].date, rawDate: points[0].date },
  ];
  if (points.length >= 7) {
    const mid = points[Math.floor(points.length / 2)];
    xTicks.push({ x: xOf(mid.date), label: mid.date, rawDate: mid.date });
  }
  const lastPoint = points[points.length - 1];
  xTicks.push({ x: xOf(lastPoint.date), label: lastPoint.date, rawDate: lastPoint.date });

  // Y ticks: min, mid, max.
  const midY = Math.round(minY + adjYRange / 2);
  const yTicks: ChartGeometry["yTicks"] = [
    { y: yOf(minY), value: minY },
    { y: yOf(midY), value: midY },
    { y: yOf(maxY), value: maxY },
  ];

  // Trend direction from first vs last median (±2% threshold).
  const first = points[0];
  const direction: "up" | "down" | "flat" =
    lastPoint.median > first.median * 1.02
      ? "up"
      : lastPoint.median < first.median * 0.98
        ? "down"
        : "flat";

  return {
    medianPath,
    bandPath,
    xTicks,
    yTicks,
    minY,
    maxY,
    innerWidth,
    innerHeight,
    summary: {
      first,
      last: lastPoint,
      min: rawMinY,
      max: rawMaxY,
      direction,
    },
  };
}
