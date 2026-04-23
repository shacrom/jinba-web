import { normalize } from "@/lib/ingest/normalize";
import type { ApifyListing, IngestTarget } from "@/lib/ingest/types";
/**
 * tests/unit/ingest-normalize.test.ts — I02 (data-sources-strategy)
 *
 * Vitest unit tests for normalize() in src/lib/ingest/normalize.ts.
 * REQ-TEST-01, design §8.1 "ingest-normalize.test.ts".
 *
 * 5 assertions covering price rounding, km null passthrough, source provenance,
 * field isolation (extra Apify fields must not bleed into the output).
 */
import { describe, expect, it } from "vitest";

const milanunciosTarget: IngestTarget = {
  gen_slug: "seat:ibiza:mk4",
  source_slug: "milanuncios",
  dataset_id: "",
};

const wallapopTarget: IngestTarget = {
  gen_slug: "volkswagen:polo:mk5",
  source_slug: "wallapop",
  dataset_id: "",
};

/** Build a minimal valid ApifyListing (passthrough fields are allowed) */
function makeListing(overrides: Partial<ApifyListing> = {}): ApifyListing {
  return {
    url: "https://www.milanuncios.com/coches/ibiza-123.htm",
    external_id: "ibiza-123",
    price: 4500,
    currency: "EUR",
    year: 2005,
    km: 95000,
    observed_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

describe("normalize()", () => {
  it("integer price is preserved as-is (Math.round of integer = same value)", () => {
    const row = makeListing({ price: 4500 });
    const out = normalize(row, milanunciosTarget);
    expect(out.price).toBe(4500);
  });

  it("decimal price 4523.7 is rounded up to 4524", () => {
    const row = makeListing({ price: 4523.7 });
    const out = normalize(row, wallapopTarget);
    expect(out.price).toBe(4524);
  });

  it("km: null in input is preserved as null in output", () => {
    const row = makeListing({ km: null });
    const out = normalize(row, milanunciosTarget);
    expect(out.km).toBeNull();
  });

  it("source_slug comes from target, not from the row", () => {
    const row = makeListing(); // row has no source_slug field
    const out = normalize(row, wallapopTarget);
    expect(out.source_slug).toBe("wallapop");
  });

  it("extra Apify passthrough fields are NOT present in the normalized output", () => {
    // ApifyListingSchema uses .passthrough() so colour survives in the parsed
    // ApifyListing, but normalize() does an explicit field-pick — colour must
    // not bleed through.
    const row = makeListing({ colour: "red" } as ApifyListing & { colour: string });
    const out = normalize(row, milanunciosTarget);
    expect(Object.prototype.hasOwnProperty.call(out, "colour")).toBe(false);
  });
});
