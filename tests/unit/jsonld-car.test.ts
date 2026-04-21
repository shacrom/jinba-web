import { buildCarJsonLd } from "@/lib/jsonld";
import type { Car, WithContext } from "schema-dts";
/**
 * jsonld-car.test.ts — T33
 * Tests for buildCarJsonLd: schema-dts type safety + JSON serialization.
 * SC-04.
 */
import { describe, expect, it } from "vitest";

const baseInput = {
  makeName: "Mazda",
  modelName: "MX-5",
  genName: "NA",
  years: { start: 1989, end: 1997 },
  chassisCode: "NA",
  description: "First-gen Mazda MX-5 roadster.",
  url: "https://jinba.example.com/es/mazda/mx-5/na/",
};

// Helper to access schema-dts opaque type fields
function asObj(v: unknown): Record<string, unknown> {
  return v as unknown as Record<string, unknown>;
}

describe("buildCarJsonLd", () => {
  it("returns a WithContext<Car> shape with base fields", () => {
    const result = buildCarJsonLd(baseInput);
    const obj = asObj(result);
    expect(obj["@context"]).toBe("https://schema.org");
    expect(obj["@type"]).toBe("Car");
    expect(obj.name).toBe("Mazda MX-5 NA");
    expect(obj.vehicleModelDate).toBe("1989/1997");
    expect(obj.vehicleConfiguration).toBe("NA");
  });

  it("omits vehicleConfiguration when chassisCode is undefined", () => {
    const result = buildCarJsonLd({ ...baseInput, chassisCode: undefined });
    const obj = asObj(result);
    expect(obj.vehicleConfiguration).toBeUndefined();
  });

  it("emits AggregateOffer when stats.count >= 5", () => {
    const result = buildCarJsonLd({
      ...baseInput,
      stats: { count: 10, low: 5000, high: 12000, median: 8000, currency: "EUR" },
    });
    const offers = asObj(asObj(result).offers);
    expect(offers).toBeDefined();
    expect(offers["@type"]).toBe("AggregateOffer");
    expect(offers.offerCount).toBe(10);
    expect(offers.lowPrice).toBe(5000);
    expect(offers.highPrice).toBe(12000);
    expect(offers.priceCurrency).toBe("EUR");
  });

  it("omits AggregateOffer when stats.count < 5", () => {
    const result = buildCarJsonLd({
      ...baseInput,
      stats: { count: 3, low: 5000, high: 12000, median: 8000, currency: "EUR" },
    });
    expect(asObj(result).offers).toBeUndefined();
  });

  it("omits AggregateOffer when stats is not provided", () => {
    const result = buildCarJsonLd(baseInput);
    expect(asObj(result).offers).toBeUndefined();
  });

  it("JSON.stringify + JSON.parse does not throw (SC-04)", () => {
    const result = buildCarJsonLd({
      ...baseInput,
      stats: { count: 10, low: 5000, high: 12000, median: 8000, currency: "EUR" },
    });
    expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
  });

  it("serialized JSON includes @context and @type", () => {
    const result = buildCarJsonLd(baseInput);
    const parsed = JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Car");
  });

  it("satisfies WithContext<Car> type at compile time", () => {
    const result: WithContext<Car> = buildCarJsonLd(baseInput);
    // Type assertion — if this compiles, the type is satisfied
    expect(typeof result).toBe("object");
  });
});
