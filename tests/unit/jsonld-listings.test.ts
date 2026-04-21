/**
 * jsonld-listings.test.ts — T29
 * Tests for buildItemListJsonLd and buildOfferJsonLd.
 * REQ-JSONLD-01, REQ-JSONLD-02, REQ-CI-03, SC-07.
 */
import { describe, expect, it } from "vitest";
import { buildItemListJsonLd, buildOfferJsonLd } from "../../src/lib/jsonld";

const SITE = "https://jinba.example.com";

describe("buildItemListJsonLd", () => {
  it("returns null when items is empty (REQ-JSONLD-01)", () => {
    const result = buildItemListJsonLd([], `${SITE}/es/listings/`, "Listings");
    expect(result).toBeNull();
  });

  it("emits ItemList with 1+ items", () => {
    const items = [
      { url: `${SITE}/es/listings/1/`, name: "MX-5 NA 1994", position: 1 },
      { url: `${SITE}/es/listings/2/`, name: "MX-5 NA 1996", position: 2 },
    ];
    const result = buildItemListJsonLd(items, `${SITE}/es/listings/`, "Test list");
    expect(result).not.toBeNull();
    expect(result?.["@type"]).toBe("ItemList");
    expect(result?.["@context"]).toBe("https://schema.org");
    expect(result?.numberOfItems).toBe(2);
  });

  it("sets correct itemListElement positions", () => {
    const items = [
      { url: `${SITE}/es/listings/10/`, name: "Car A", position: 1 },
      { url: `${SITE}/es/listings/20/`, name: "Car B", position: 2 },
    ];
    const result = buildItemListJsonLd(items, `${SITE}/es/listings/`, "list");
    const elements = result?.itemListElement as unknown as Array<{ position: number; url: string }>;
    expect(elements[0].position).toBe(1);
    expect(elements[1].position).toBe(2);
    expect(elements[0].url).toBe(`${SITE}/es/listings/10/`);
  });

  it("serializes without throwing (SC-07)", () => {
    const items = [{ url: `${SITE}/es/listings/1/`, name: "car", position: 1 }];
    const result = buildItemListJsonLd(items, `${SITE}/es/listings/`, "list");
    expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
  });

  it("sets list url and name", () => {
    const listUrl = `${SITE}/en/listings/`;
    const result = buildItemListJsonLd(
      [{ url: `${SITE}/en/listings/5/`, name: "Car", position: 1 }],
      listUrl,
      "My list"
    );
    expect(result?.url).toBe(listUrl);
    expect(result?.name).toBe("My list");
  });
});

describe("buildOfferJsonLd", () => {
  it("returns null when price is null (REQ-JSONLD-02)", () => {
    const result = buildOfferJsonLd({
      price: null,
      currency: "EUR",
      url: `${SITE}/es/listings/1/`,
      name: "Car listing",
    });
    expect(result).toBeNull();
  });

  it("emits Offer when price is present", () => {
    const result = buildOfferJsonLd({
      price: 8500,
      currency: "EUR",
      url: `${SITE}/es/listings/1/`,
      name: "MX-5 NA 1994",
    });
    expect(result).not.toBeNull();
    expect(result?.["@type"]).toBe("Offer");
    expect(result?.["@context"]).toBe("https://schema.org");
    expect(result?.price).toBe(8500);
    expect(result?.priceCurrency).toBe("EUR");
  });

  it("defaults to UsedCondition", () => {
    const result = buildOfferJsonLd({
      price: 5000,
      currency: "EUR",
      url: `${SITE}/es/listings/2/`,
      name: "Car",
    });
    expect(result?.itemCondition).toBe("https://schema.org/UsedCondition");
  });

  it("defaults to InStock availability", () => {
    const result = buildOfferJsonLd({
      price: 3000,
      currency: "EUR",
      url: `${SITE}/es/listings/3/`,
      name: "Car",
    });
    expect(result?.availability).toBe("https://schema.org/InStock");
  });

  it("accepts custom itemCondition and availability", () => {
    const result = buildOfferJsonLd({
      price: 10000,
      currency: "EUR",
      url: `${SITE}/es/listings/4/`,
      name: "Car",
      itemCondition: "https://schema.org/RefurbishedCondition",
      availability: "https://schema.org/PreOrder",
    });
    expect(result?.itemCondition).toBe("https://schema.org/RefurbishedCondition");
    expect(result?.availability).toBe("https://schema.org/PreOrder");
  });

  it("serializes without throwing", () => {
    const result = buildOfferJsonLd({
      price: 7000,
      currency: "USD",
      url: `${SITE}/en/listings/5/`,
      name: "Car",
    });
    expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
  });
});
