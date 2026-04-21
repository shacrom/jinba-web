import { beforeEach, describe, expect, it, vi } from "vitest";

// We need to stub import.meta.env before importing seo
beforeEach(() => {
  vi.stubEnv("PUBLIC_SITE_URL", "https://jinba.example.com");
});

describe("getMetaTags", () => {
  it("ES home returns correct hreflang alternates", async () => {
    const { getMetaTags } = await import("@/lib/seo");
    const meta = getMetaTags({
      title: "Test",
      description: "Test desc",
      locale: "es",
      path: "/es/",
    });
    expect(meta.canonical).toBe("https://jinba.example.com/es/");
    const hreflangs = meta.alternates.map((a) => a.hreflang);
    expect(hreflangs).toContain("es-ES");
    expect(hreflangs).toContain("en-US");
    expect(meta.alternates).toHaveLength(2);
    expect(meta.xDefault).toBe("https://jinba.example.com/es/");
  });

  it("EN page returns cross-referenced alternates", async () => {
    const { getMetaTags } = await import("@/lib/seo");
    const meta = getMetaTags({
      title: "Test EN",
      description: "Test desc EN",
      locale: "en",
      path: "/en/",
    });
    expect(meta.canonical).toBe("https://jinba.example.com/en/");
    const alternateHrefs = meta.alternates.map((a) => a.href);
    expect(alternateHrefs).toContain("https://jinba.example.com/en/");
    expect(alternateHrefs).toContain("https://jinba.example.com/es/");
    // x-default always points to ES
    expect(meta.xDefault).toBe("https://jinba.example.com/es/");
  });

  it("canonical URL is absolute", async () => {
    const { getMetaTags } = await import("@/lib/seo");
    const meta = getMetaTags({
      title: "Deep",
      description: "Deep page",
      locale: "es",
      path: "/es/modelos/mazda/mx-5/na",
    });
    expect(meta.canonical).toMatch(/^https?:\/\//);
    expect(meta.canonical).toContain("/es/modelos/mazda/mx-5/na");
  });
});
