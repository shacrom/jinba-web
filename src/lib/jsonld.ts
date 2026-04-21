/**
 * jsonld.ts — JSON-LD helpers for model pages and listings.
 * T16 (M2): buildCarJsonLd — Car + conditional AggregateOffer.
 * T01 (M3): buildItemListJsonLd — ItemList for list pages.
 *           buildOfferJsonLd   — Offer for detail page.
 */
import type { Car, ItemList, ListItem, Offer, WithContext } from "schema-dts";

export interface CarJsonLdInput {
  makeName: string;
  modelName: string;
  genName: string;
  years: { start: number; end?: number };
  chassisCode?: string;
  description: string;
  url: string;
  image?: string;
  stats?: {
    count: number;
    low: number;
    high: number;
    median: number;
    currency: string;
  };
}

/**
 * Builds a Schema.org Car JSON-LD object.
 * AggregateOffer is only emitted when stats.count >= 5 (anti-spam guardrail).
 * Null/undefined fields are omitted from the output.
 */
export function buildCarJsonLd(input: CarJsonLdInput): WithContext<Car> {
  const base: WithContext<Car> = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${input.makeName} ${input.modelName} ${input.genName}`,
    brand: { "@type": "Brand", name: input.makeName },
    model: input.modelName,
    vehicleModelDate: `${input.years.start}${input.years.end ? `/${input.years.end}` : ""}`,
    description: input.description,
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.chassisCode ? { vehicleConfiguration: input.chassisCode } : {}),
  };

  if (input.stats && input.stats.count >= 5) {
    // AggregateOffer — only emitted when there are enough data points
    // schema-dts Car doesn't expose offers in its strict type; cast through unknown
    const withOffers = base as unknown as Record<string, unknown>;
    withOffers.offers = {
      "@type": "AggregateOffer",
      offerCount: input.stats.count,
      lowPrice: input.stats.low,
      highPrice: input.stats.high,
      priceCurrency: input.stats.currency,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
    };
  }

  return base;
}

// ── M3 helpers ──────────────────────────────────────────────────────────────

export interface ItemListEntry {
  url: string;
  name: string;
  position: number;
}

/**
 * Builds a Schema.org ItemList JSON-LD block for listing pages.
 * Returns null when items array is empty (REQ-JSONLD-01: omit when 0 listings).
 */
export function buildItemListJsonLd(
  items: ItemListEntry[],
  listUrl: string,
  name: string
): WithContext<ItemList> | null {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: listUrl,
    numberOfItems: items.length,
    itemListElement: items.map(
      (item) =>
        ({
          "@type": "ListItem",
          position: item.position,
          url: item.url,
          name: item.name,
        }) satisfies ListItem
    ),
  };
}

export interface OfferJsonLdInput {
  price: number | null;
  currency: string;
  url: string;
  name: string;
  itemCondition?: string;
  availability?: string;
}

/**
 * Builds a Schema.org Offer JSON-LD block for a single listing detail page.
 * Returns null when price is null (REQ-JSONLD-02: omit Offer when price null).
 */
export function buildOfferJsonLd(input: OfferJsonLdInput): WithContext<Offer> | null {
  if (input.price === null) return null;
  // schema-dts itemCondition / availability types are strict IdReference unions.
  // Cast through a plain object to avoid fighting the generated types — the values
  // are valid Schema.org IRI strings that satisfy the spec at runtime.
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: input.name,
    url: input.url,
    price: input.price,
    priceCurrency: input.currency,
    itemCondition: input.itemCondition ?? "https://schema.org/UsedCondition",
    availability: input.availability ?? "https://schema.org/InStock",
  };
  return obj as unknown as WithContext<Offer>;
}
