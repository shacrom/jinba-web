import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/jsonld";
/**
 * jsonld-home.test.ts — T18
 * Tests the M1 Home JSON-LD helpers: buildOrganizationJsonLd + buildWebsiteJsonLd.
 * REQ-TEST-01.
 */
import { describe, expect, it } from "vitest";

const SITE = "https://jinba.example.com";

describe("buildOrganizationJsonLd", () => {
  const json = buildOrganizationJsonLd(SITE) as unknown as Record<string, unknown>;

  it("emits @context Schema.org and @type Organization", () => {
    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@type"]).toBe("Organization");
  });

  it("stamps deterministic @id for cross-references", () => {
    expect(json["@id"]).toBe(`${SITE}#organization`);
  });

  it("includes required publisher fields", () => {
    expect(json.name).toBe("Jinba");
    expect(json.url).toBe(SITE);
    expect(json.logo).toBe(`${SITE}/favicon.svg`);
    expect(Array.isArray(json.sameAs)).toBe(true);
    expect((json.sameAs as unknown[]).length).toBe(0);
  });
});

describe("buildWebsiteJsonLd", () => {
  const jsonEs = buildWebsiteJsonLd(SITE, "es") as unknown as Record<string, unknown>;
  const jsonEn = buildWebsiteJsonLd(SITE, "en") as unknown as Record<string, unknown>;

  it("emits @context Schema.org and @type WebSite", () => {
    expect(jsonEs["@context"]).toBe("https://schema.org");
    expect(jsonEs["@type"]).toBe("WebSite");
  });

  it("stamps deterministic @id", () => {
    expect(jsonEs["@id"]).toBe(`${SITE}#website`);
  });

  it("sets inLanguage per locale", () => {
    expect(jsonEs.inLanguage).toBe("es-ES");
    expect(jsonEn.inLanguage).toBe("en-US");
  });

  it("publisher references the Organization via @id (not duplicated inline)", () => {
    const publisher = jsonEs.publisher as Record<string, unknown>;
    expect(publisher["@id"]).toBe(`${SITE}#organization`);
    // Must be a reference (only @id), not an inline copy of the Organization
    expect(publisher["@type"]).toBeUndefined();
  });

  it("SearchAction target urlTemplate points to the correct locale listings route", () => {
    const pa = jsonEs.potentialAction as Record<string, unknown>;
    expect(pa["@type"]).toBe("SearchAction");
    const target = pa.target as Record<string, unknown>;
    expect(target["@type"]).toBe("EntryPoint");
    expect(target.urlTemplate).toBe(`${SITE}/es/listings/?q={search_term_string}`);

    const paEn = jsonEn.potentialAction as Record<string, unknown>;
    const targetEn = paEn.target as Record<string, unknown>;
    expect(targetEn.urlTemplate).toBe(`${SITE}/en/listings/?q={search_term_string}`);
  });

  it("includes the query-input descriptor", () => {
    const pa = jsonEs.potentialAction as Record<string, unknown>;
    expect(pa["query-input"]).toBe("required name=search_term_string");
  });
});
