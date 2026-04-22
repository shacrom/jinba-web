import { buildArticleJsonLd } from "@/lib/jsonld";
import { describe, expect, it } from "vitest";

const base = {
  title: "How to inspect an NA",
  description: "Checklist for pre-purchase.",
  datePublished: "2026-03-15T00:00:00.000Z",
  url: "https://jinba.example.com/en/guides/mx5-na-inspection/",
  locale: "en" as const,
  siteOrgId: "https://jinba.example.com#organization",
};

describe("buildArticleJsonLd", () => {
  it("returns a well-formed Article with mandatory fields", () => {
    const ld = buildArticleJsonLd(base) as unknown as Record<string, unknown>;
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe(base.title);
    expect(ld.description).toBe(base.description);
    expect(ld.datePublished).toBe(base.datePublished);
    expect(ld.inLanguage).toBe("en-US");
    expect(ld.mainEntityOfPage).toMatchObject({ "@type": "WebPage", "@id": base.url });
    expect(ld.publisher).toMatchObject({ "@id": base.siteOrgId });
  });

  it("falls back to the site-origin home-hero placeholder when image is absent", () => {
    const ld = buildArticleJsonLd(base) as unknown as Record<string, unknown>;
    expect(ld.image).toBe("https://jinba.example.com/placeholders/home-hero.webp");
  });

  it("uses the provided image when present", () => {
    const ld = buildArticleJsonLd({
      ...base,
      image: "https://cdn.example.com/guides/hero.webp",
    }) as unknown as Record<string, unknown>;
    expect(ld.image).toBe("https://cdn.example.com/guides/hero.webp");
  });

  it("emits author as a Person only when provided", () => {
    const without = buildArticleJsonLd(base) as unknown as Record<string, unknown>;
    expect(without.author).toBeUndefined();

    const withAuthor = buildArticleJsonLd({ ...base, author: "Marma" }) as unknown as Record<
      string,
      unknown
    >;
    expect(withAuthor.author).toEqual({ "@type": "Person", name: "Marma" });
  });

  it("maps locale es to es-ES", () => {
    const ld = buildArticleJsonLd({ ...base, locale: "es" }) as unknown as Record<string, unknown>;
    expect(ld.inLanguage).toBe("es-ES");
  });

  it("includes dateModified only when provided", () => {
    const base1 = buildArticleJsonLd(base) as unknown as Record<string, unknown>;
    expect(base1.dateModified).toBeUndefined();
    const withMod = buildArticleJsonLd({
      ...base,
      dateModified: "2026-04-01T00:00:00.000Z",
    }) as unknown as Record<string, unknown>;
    expect(withMod.dateModified).toBe("2026-04-01T00:00:00.000Z");
  });
});
