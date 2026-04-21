/**
 * listings-query.test.ts — T28
 * Tests for Zod param validation in listings-query.ts.
 * REQ-FILTER-02, REQ-CI-03.
 */
import { describe, expect, it } from "vitest";
import { parseListingParams } from "../../src/lib/listings-query";

describe("parseListingParams — valid inputs", () => {
  it("parses empty params with defaults", () => {
    const result = parseListingParams({});
    expect(result).toEqual({});
  });

  it("parses price_min as number", () => {
    const result = parseListingParams({ price_min: "5000" });
    expect(result.price_min).toBe(5000);
  });

  it("parses price_max as number", () => {
    const result = parseListingParams({ price_max: "20000" });
    expect(result.price_max).toBe(20000);
  });

  it("parses year range", () => {
    const result = parseListingParams({ year_min: "1989", year_max: "1997" });
    expect(result.year_min).toBe(1989);
    expect(result.year_max).toBe(1997);
  });

  it("parses km_max", () => {
    const result = parseListingParams({ km_max: "100000" });
    expect(result.km_max).toBe(100000);
  });

  it("parses valid sort values", () => {
    expect(parseListingParams({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseListingParams({ sort: "price_desc" }).sort).toBe("price_desc");
    expect(parseListingParams({ sort: "last_seen_at_desc" }).sort).toBe("last_seen_at_desc");
  });

  it("parses cursor", () => {
    expect(parseListingParams({ cursor: "42" }).cursor).toBe(42);
  });

  it("parses gen slug", () => {
    expect(parseListingParams({ gen: "mx-5-na" }).gen).toBe("mx-5-na");
  });

  it("parses status", () => {
    expect(parseListingParams({ status: "active" }).status).toBe("active");
  });
});

describe("parseListingParams — invalid inputs are coerced/stripped", () => {
  it("coerces price_min: 'abc' to undefined (no throw)", () => {
    const result = parseListingParams({ price_min: "abc" });
    expect(result.price_min).toBeUndefined();
  });

  it("coerces price_max: '' to undefined", () => {
    const result = parseListingParams({ price_max: "" });
    expect(result.price_max).toBeUndefined();
  });

  it("coerces year_min: 'bad' to undefined", () => {
    const result = parseListingParams({ year_min: "bad" });
    expect(result.year_min).toBeUndefined();
  });

  it("coerces invalid sort to undefined", () => {
    const result = parseListingParams({ sort: "not_a_sort" as unknown as string });
    expect(result.sort).toBeUndefined();
  });

  it("coerces invalid status to undefined", () => {
    const result = parseListingParams({ status: "invalid_status" as unknown as string });
    expect(result.status).toBeUndefined();
  });

  it("does not throw on arbitrary unknown keys", () => {
    expect(() =>
      parseListingParams({ price_min: "abc", year_min: "xyz", sort: "bad", totally_unknown: "val" })
    ).not.toThrow();
  });

  it("coerces cursor: 'abc' to undefined", () => {
    const result = parseListingParams({ cursor: "abc" });
    expect(result.cursor).toBeUndefined();
  });

  it("parses URLSearchParams input", () => {
    const sp = new URLSearchParams("price_min=3000&sort=price_asc");
    const result = parseListingParams(sp);
    expect(result.price_min).toBe(3000);
    expect(result.sort).toBe("price_asc");
  });
});
