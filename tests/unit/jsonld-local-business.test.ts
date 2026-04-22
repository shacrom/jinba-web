import { buildLocalBusinessJsonLd } from "@/lib/jsonld";
import { describe, expect, it } from "vitest";

const base = {
  name: "Madrid Classics",
  type: "workshop" as const,
  url: "https://jinba.example.com/es/services/madrid-classics/",
  locale: "es" as const,
  description: "Taller especializado en clásicos japoneses en Madrid.",
  siteOrgId: "https://jinba.example.com#organization",
};

describe("buildLocalBusinessJsonLd", () => {
  it("maps each service type to the expected Schema.org @type", () => {
    const cases: Array<{
      type: "workshop" | "homologation" | "parts" | "media";
      expected: string;
    }> = [
      { type: "workshop", expected: "AutoRepair" },
      { type: "homologation", expected: "AutomotiveBusiness" },
      { type: "parts", expected: "Store" },
      { type: "media", expected: "WebSite" },
    ];
    for (const { type, expected } of cases) {
      const ld = buildLocalBusinessJsonLd({ ...base, type }) as unknown as Record<string, unknown>;
      expect(ld["@type"]).toBe(expected);
    }
  });

  it("emits mandatory fields unconditionally", () => {
    const ld = buildLocalBusinessJsonLd(base) as unknown as Record<string, unknown>;
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld.name).toBe(base.name);
    expect(ld.description).toBe(base.description);
    expect(ld.url).toBe(base.url);
    expect(ld.inLanguage).toBe("es-ES");
  });

  it("maps en → en-US", () => {
    const ld = buildLocalBusinessJsonLd({ ...base, locale: "en" }) as unknown as Record<
      string,
      unknown
    >;
    expect(ld.inLanguage).toBe("en-US");
  });

  it("emits publisher only when type is media", () => {
    const nonMedia = buildLocalBusinessJsonLd(base) as unknown as Record<string, unknown>;
    expect(nonMedia.publisher).toBeUndefined();

    const media = buildLocalBusinessJsonLd({ ...base, type: "media" }) as unknown as Record<
      string,
      unknown
    >;
    expect(media.publisher).toEqual({ "@id": base.siteOrgId });
  });

  it("omits optional fields when not provided", () => {
    const ld = buildLocalBusinessJsonLd(base) as unknown as Record<string, unknown>;
    expect(ld.telephone).toBeUndefined();
    expect(ld.sameAs).toBeUndefined();
    expect(ld.address).toBeUndefined();
    expect(ld.geo).toBeUndefined();
  });

  it("includes telephone verbatim when provided", () => {
    const ld = buildLocalBusinessJsonLd({
      ...base,
      telephone: "+34 910 000 001",
    }) as unknown as Record<string, unknown>;
    expect(ld.telephone).toBe("+34 910 000 001");
  });

  it("emits sameAs as an array containing the website URL", () => {
    const ld = buildLocalBusinessJsonLd({
      ...base,
      website: "https://madridclassics.example.com",
    }) as unknown as Record<string, unknown>;
    expect(ld.sameAs).toEqual(["https://madridclassics.example.com"]);
  });

  it("emits PostalAddress when city and/or country are provided", () => {
    const onlyCity = buildLocalBusinessJsonLd({ ...base, city: "Madrid" }) as unknown as Record<
      string,
      unknown
    >;
    expect(onlyCity.address).toEqual({ "@type": "PostalAddress", addressLocality: "Madrid" });

    const onlyCountry = buildLocalBusinessJsonLd({
      ...base,
      country: "España",
    }) as unknown as Record<string, unknown>;
    expect(onlyCountry.address).toEqual({ "@type": "PostalAddress", addressCountry: "España" });

    const both = buildLocalBusinessJsonLd({
      ...base,
      city: "Madrid",
      country: "España",
    }) as unknown as Record<string, unknown>;
    expect(both.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Madrid",
      addressCountry: "España",
    });
  });

  it("emits GeoCoordinates when geo is provided", () => {
    const ld = buildLocalBusinessJsonLd({
      ...base,
      geo: { lat: 40.4168, lng: -3.7038 },
    }) as unknown as Record<string, unknown>;
    expect(ld.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 40.4168,
      longitude: -3.7038,
    });
  });
});
