import { describe, expect, it, vi } from "vitest";

// Force `meili` to null by not setting PUBLIC_MEILI_URL. Vite has already read
// env vars at module load time, so this is accurate by default in test env.
vi.mock("@/lib/meilisearch", () => ({ meili: null }));

describe("searchContent — graceful degradation", () => {
  it("resolves to [] when Meili is not configured, regardless of query", async () => {
    const { searchContent, isSearchConfigured } = await import("@/lib/search");
    expect(isSearchConfigured()).toBe(false);
    expect(await searchContent("anything", { locale: "es" })).toEqual([]);
    expect(await searchContent("mazda", { locale: "en", limit: 5 })).toEqual([]);
  });

  it("resolves to [] on empty query even when configured would be true", async () => {
    const { searchContent } = await import("@/lib/search");
    expect(await searchContent("   ", { locale: "es" })).toEqual([]);
  });
});
