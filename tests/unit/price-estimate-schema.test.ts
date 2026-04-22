import { CURRENT_YEAR, PriceEstimateRequest } from "@/lib/price-estimate-types";
/**
 * price-estimate-schema.test.ts — M5
 * Zod validation for the `/api/price-estimate` request body.
 * REQ-CALC-ENDPOINT-01, REQ-CALC-TEST-01.
 */
import { describe, expect, it } from "vitest";

const validBody = {
  make: "mazda",
  model: "mx-5",
  gen: "na",
  year: 1994,
  km: 150_000,
  condition: "good" as const,
  currency: "EUR" as const,
};

describe("PriceEstimateRequest", () => {
  it("accepts a minimal valid body (without optional trim)", () => {
    const r = PriceEstimateRequest.safeParse(validBody);
    expect(r.success).toBe(true);
  });

  it("accepts an optional trim slug", () => {
    const r = PriceEstimateRequest.safeParse({ ...validBody, trim: "1.8-bp" });
    expect(r.success).toBe(true);
  });

  it("defaults currency to EUR when omitted", () => {
    const { currency: _c, ...noCurrency } = validBody;
    const r = PriceEstimateRequest.safeParse(noCurrency);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.currency).toBe("EUR");
  });

  it("fails when year is missing", () => {
    const { year: _y, ...body } = validBody;
    const r = PriceEstimateRequest.safeParse(body);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("year"))).toBe(true);
    }
  });

  it("fails on an unknown condition", () => {
    const r = PriceEstimateRequest.safeParse({ ...validBody, condition: "pristine" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("condition"))).toBe(true);
    }
  });

  it("rejects an impossibly old year", () => {
    const r = PriceEstimateRequest.safeParse({ ...validBody, year: 1900 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("year"))).toBe(true);
    }
  });

  it("rejects a year far in the future", () => {
    const r = PriceEstimateRequest.safeParse({ ...validBody, year: CURRENT_YEAR + 10 });
    expect(r.success).toBe(false);
  });

  it("rejects negative km", () => {
    const r = PriceEstimateRequest.safeParse({ ...validBody, km: -1 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("km"))).toBe(true);
    }
  });

  it("rejects unreasonably high km (>999_999)", () => {
    const r = PriceEstimateRequest.safeParse({ ...validBody, km: 1_500_000 });
    expect(r.success).toBe(false);
  });

  it("rejects an empty make slug", () => {
    const r = PriceEstimateRequest.safeParse({ ...validBody, make: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("make"))).toBe(true);
    }
  });

  it("rejects a non-EUR currency literal", () => {
    const r = PriceEstimateRequest.safeParse({ ...validBody, currency: "USD" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("currency"))).toBe(true);
    }
  });
});
