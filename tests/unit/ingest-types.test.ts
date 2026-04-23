import { ApifyListingSchema, IngestedPricePointSchema } from "@/lib/ingest/types";
/**
 * tests/unit/ingest-types.test.ts — I01 (data-sources-strategy)
 *
 * Vitest unit tests for Zod schemas in src/lib/ingest/types.ts.
 * REQ-TEST-01, design §8.1 "ingest-types.test.ts".
 *
 * 9 assertions covering ApifyListingSchema and IngestedPricePointSchema.
 */
import { describe, expect, it } from "vitest";

/** Minimal valid ApifyListing fixture */
const validListing = {
  url: "https://www.milanuncios.com/coches-de-segunda-mano/seat-ibiza-123456.htm",
  external_id: "abc123",
  price: 4500,
  currency: "EUR" as const,
  year: 2005,
  km: 95000,
  observed_at: "2026-04-01T00:00:00Z",
};

describe("ApifyListingSchema", () => {
  it("valid listing with all required fields passes", () => {
    const result = ApifyListingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it("extra unknown field is preserved via .passthrough()", () => {
    const result = ApifyListingSchema.safeParse({ ...validListing, colour: "red" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    // passthrough() means the extra key survives in the output
    expect((result.data as Record<string, unknown>).colour).toBe("red");
  });

  it("missing price field fails", () => {
    const { price: _p, ...withoutPrice } = validListing;
    const result = ApifyListingSchema.safeParse(withoutPrice);
    expect(result.success).toBe(false);
  });

  it("currency USD is rejected (must be EUR)", () => {
    const result = ApifyListingSchema.safeParse({ ...validListing, currency: "USD" });
    expect(result.success).toBe(false);
  });

  it("year 1949 is rejected (below minimum 1950)", () => {
    const result = ApifyListingSchema.safeParse({ ...validListing, year: 1949 });
    expect(result.success).toBe(false);
  });

  it("year 2101 is rejected (above maximum 2100)", () => {
    const result = ApifyListingSchema.safeParse({ ...validListing, year: 2101 });
    expect(result.success).toBe(false);
  });

  it("km: null passes (not all listings post odometer)", () => {
    const result = ApifyListingSchema.safeParse({ ...validListing, km: null });
    expect(result.success).toBe(true);
  });
});

describe("IngestedPricePointSchema", () => {
  const validPoint = {
    source_slug: "milanuncios" as const,
    gen_slug: "seat:ibiza:mk4",
    external_id: "abc123",
    year: 2005,
    km: 95000,
    price: 4500,
    currency: "EUR" as const,
    observed_at: "2026-04-01T00:00:00Z",
  };

  it("valid IngestedPricePoint passes", () => {
    const result = IngestedPricePointSchema.safeParse(validPoint);
    expect(result.success).toBe(true);
  });

  it("invalid source_slug fails (not in enum)", () => {
    const result = IngestedPricePointSchema.safeParse({
      ...validPoint,
      source_slug: "scraper",
    });
    expect(result.success).toBe(false);
  });
});
