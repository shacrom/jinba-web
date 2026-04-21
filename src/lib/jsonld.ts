/**
 * jsonld.ts — JSON-LD helpers for model pages.
 * T16: Builds schema-dts-typed Car + conditional AggregateOffer objects.
 */
import type { Car, WithContext } from "schema-dts";

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
