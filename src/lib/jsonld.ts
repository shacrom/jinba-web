/**
 * jsonld.ts — JSON-LD helpers for model pages, listings, and home.
 * T16 (M2): buildCarJsonLd — Car + conditional AggregateOffer.
 * T01 (M3): buildItemListJsonLd — ItemList for list pages.
 *           buildOfferJsonLd   — Offer for detail page.
 * T01 (M1): buildOrganizationJsonLd + buildWebsiteJsonLd — Home @graph.
 * T06 (M4): buildPriceHistoryJsonLd — Dataset for /prices/ page.
 */
import type { Locale } from "@/i18n/config";
import type {
  Car,
  Dataset,
  ItemList,
  ListItem,
  Offer,
  Organization,
  WebSite,
  WithContext,
} from "schema-dts";

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

// ── M1 helpers ──────────────────────────────────────────────────────────────

/**
 * Builds a Schema.org Organization JSON-LD block for the site publisher.
 * Stamps a deterministic `@id` so WebSite can reference it by reference.
 * REQ-JSONLD-01/02, REQ-SEO-04.
 */
export function buildOrganizationJsonLd(site: string): WithContext<Organization> {
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site}#organization`,
    name: "Jinba",
    url: site,
    logo: `${site}/favicon.svg`,
    sameAs: [],
  };
  return obj as unknown as WithContext<Organization>;
}

/**
 * Builds a Schema.org WebSite JSON-LD block with a SearchAction pointing at
 * `/{locale}/listings/?q={search_term_string}` (M4 wires Meilisearch; in F1
 * the URL is reserved and validated by Zod in listings-query.ts).
 * REQ-JSONLD-01/02, REQ-SEO-03.
 */
export function buildWebsiteJsonLd(site: string, locale: Locale): WithContext<WebSite> {
  const target = `${site}/${locale}/listings/?q={search_term_string}`;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site}#website`,
    name: "Jinba",
    url: site,
    inLanguage: locale === "es" ? "es-ES" : "en-US",
    publisher: { "@id": `${site}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: target,
      },
      "query-input": "required name=search_term_string",
    },
  };
  return obj as unknown as WithContext<WebSite>;
}

// ── M4 helpers ──────────────────────────────────────────────────────────────

export interface PriceHistoryJsonLdInput {
  name: string;
  description: string;
  url: string;
  locale: Locale;
  points: Array<{
    date: string;
    median: number;
    p25: number;
    p75: number;
    count: number;
  }>;
  currency: string;
  siteOrgId: string; // e.g. "https://site/#organization"
}

/**
 * Builds a Schema.org Dataset JSON-LD block for the price-history page.
 * Returns null when there aren't enough points to form a meaningful dataset
 * (spec parity with REQ-PH-02: chart hides when <3 points).
 * REQ-PH-07, REQ-JSONLD-01.
 */
export function buildPriceHistoryJsonLd(
  input: PriceHistoryJsonLdInput
): WithContext<Dataset> | null {
  if (input.points.length < 3) return null;

  const first = input.points[0].date;
  const last = input.points[input.points.length - 1].date;

  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.locale === "es" ? "es-ES" : "en-US",
    temporalCoverage: `${first}/${last}`,
    creator: { "@id": input.siteOrgId },
    variableMeasured: [
      { "@type": "PropertyValue", name: "median", unitText: input.currency },
      { "@type": "PropertyValue", name: "p25", unitText: input.currency },
      { "@type": "PropertyValue", name: "p75", unitText: input.currency },
      { "@type": "PropertyValue", name: "count" },
    ],
  };
  return obj as unknown as WithContext<Dataset>;
}
