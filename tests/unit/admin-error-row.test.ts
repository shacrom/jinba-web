import { type ScrapeErrorRow, formatErrorRow } from "@/lib/admin-scraping-format";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-04-21T12:00:00.000Z");

function makeRow(overrides: Partial<ScrapeErrorRow> = {}): ScrapeErrorRow {
  return {
    id: 1,
    run_id: 10,
    url: "https://example.com/listing/42",
    error_type: "http_429",
    message: "Too many requests",
    occurred_at: new Date(NOW.getTime() - 30_000).toISOString(),
    ...overrides,
  };
}

describe("formatErrorRow", () => {
  it("formats a full row", () => {
    const slugs = new Map<number, string>([[10, "mercadolibre-ar"]]);
    const out = formatErrorRow(makeRow(), slugs, NOW);
    expect(out.sourceSlug).toBe("mercadolibre-ar");
    expect(out.bucket).toBe("http");
    expect(out.urlDisplay).toBe("https://example.com/listing/42");
    expect(out.message).toBe("Too many requests");
    expect(out.occurredDisplay).toBe("hace 30 s");
  });

  it("returns url null when missing and sourceSlug fallback when map empty", () => {
    const out = formatErrorRow(makeRow({ url: null }), new Map(), NOW);
    expect(out.url).toBeNull();
    expect(out.urlDisplay).toBeNull();
    expect(out.sourceSlug).toBe("desconocido");
  });

  it("truncates overflow message to 120 chars with ellipsis", () => {
    const long = "x".repeat(200);
    const out = formatErrorRow(makeRow({ message: long }), new Map(), NOW);
    expect(out.message.length).toBe(120);
    expect(out.message.endsWith("…")).toBe(true);
  });

  it("truncates overflow url to 60 chars with ellipsis but keeps full url for href", () => {
    const longUrl = `https://example.com/${"p".repeat(200)}`;
    const out = formatErrorRow(makeRow({ url: longUrl }), new Map(), NOW);
    expect(out.urlDisplay?.length).toBe(60);
    expect(out.urlDisplay?.endsWith("…")).toBe(true);
    expect(out.url).toBe(longUrl);
  });
});
