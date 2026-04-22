/**
 * jsonld-price-history.test.ts — M4 T12
 * Tests for buildPriceHistoryJsonLd: Dataset shape + null guard.
 * REQ-PH-07.
 */
import { buildPriceHistoryJsonLd } from "@/lib/jsonld";
import { describe, expect, it } from "vitest";

function asObj(v: unknown): Record<string, unknown> {
  return v as unknown as Record<string, unknown>;
}

const baseInput = {
  name: "Price history — Mazda MX-5 NA | Jinba",
  description: "Median price evolution over the last year.",
  url: "https://jinba.example.com/es/mazda/mx-5/na/prices/",
  locale: "es" as const,
  currency: "EUR",
  siteOrgId: "https://jinba.example.com#organization",
};

describe("buildPriceHistoryJsonLd", () => {
  it("returns null when points array is empty", () => {
    expect(buildPriceHistoryJsonLd({ ...baseInput, points: [] })).toBeNull();
  });

  it("returns null when fewer than 3 points", () => {
    expect(
      buildPriceHistoryJsonLd({
        ...baseInput,
        points: [
          { date: "2026-01-01", median: 1000, p25: 900, p75: 1100, count: 2 },
          { date: "2026-01-02", median: 1000, p25: 900, p75: 1100, count: 2 },
        ],
      })
    ).toBeNull();
  });

  it("returns Dataset with temporalCoverage covering first to last date", () => {
    const result = buildPriceHistoryJsonLd({
      ...baseInput,
      points: [
        { date: "2026-01-01", median: 1000, p25: 900, p75: 1100, count: 2 },
        { date: "2026-02-01", median: 1100, p25: 950, p75: 1200, count: 3 },
        { date: "2026-03-01", median: 1200, p25: 1000, p75: 1300, count: 4 },
      ],
    });
    expect(result).not.toBeNull();
    const obj = asObj(result);
    expect(obj["@type"]).toBe("Dataset");
    expect(obj.name).toBe(baseInput.name);
    expect(obj.url).toBe(baseInput.url);
    expect(obj.temporalCoverage).toBe("2026-01-01/2026-03-01");
  });

  it("includes variableMeasured array with median, p25, p75, count", () => {
    const result = buildPriceHistoryJsonLd({
      ...baseInput,
      points: [
        { date: "2026-01-01", median: 1000, p25: 900, p75: 1100, count: 2 },
        { date: "2026-02-01", median: 1100, p25: 950, p75: 1200, count: 3 },
        { date: "2026-03-01", median: 1200, p25: 1000, p75: 1300, count: 4 },
      ],
    });
    const obj = asObj(result);
    const variables = obj.variableMeasured as Array<Record<string, unknown>>;
    expect(variables).toHaveLength(4);
    expect(variables.map((v) => v.name)).toEqual(["median", "p25", "p75", "count"]);
    expect(variables[0].unitText).toBe("EUR");
    // count has no unit
    expect(variables[3].unitText).toBeUndefined();
  });

  it("emits inLanguage based on locale", () => {
    const es = buildPriceHistoryJsonLd({
      ...baseInput,
      locale: "es",
      points: [
        { date: "2026-01-01", median: 1000, p25: 900, p75: 1100, count: 2 },
        { date: "2026-02-01", median: 1100, p25: 950, p75: 1200, count: 3 },
        { date: "2026-03-01", median: 1200, p25: 1000, p75: 1300, count: 4 },
      ],
    });
    expect(asObj(es).inLanguage).toBe("es-ES");

    const en = buildPriceHistoryJsonLd({
      ...baseInput,
      locale: "en",
      points: [
        { date: "2026-01-01", median: 1000, p25: 900, p75: 1100, count: 2 },
        { date: "2026-02-01", median: 1100, p25: 950, p75: 1200, count: 3 },
        { date: "2026-03-01", median: 1200, p25: 1000, p75: 1300, count: 4 },
      ],
    });
    expect(asObj(en).inLanguage).toBe("en-US");
  });

  it("references siteOrgId as creator", () => {
    const result = buildPriceHistoryJsonLd({
      ...baseInput,
      points: [
        { date: "2026-01-01", median: 1000, p25: 900, p75: 1100, count: 2 },
        { date: "2026-02-01", median: 1100, p25: 950, p75: 1200, count: 3 },
        { date: "2026-03-01", median: 1200, p25: 1000, p75: 1300, count: 4 },
      ],
    });
    const obj = asObj(result);
    expect(asObj(obj.creator)["@id"]).toBe(baseInput.siteOrgId);
  });
});
