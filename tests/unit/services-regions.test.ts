import {
  REGION_LABELS_EN,
  REGION_LABELS_ES,
  REGION_VALUES,
  TYPE_VALUES,
  regionLabel,
} from "@/lib/services-regions";
import { describe, expect, it } from "vitest";

describe("services-regions", () => {
  it("covers every REGION_VALUES entry with a Spanish label", () => {
    for (const v of REGION_VALUES) {
      expect(REGION_LABELS_ES[v]).toBeDefined();
      expect(REGION_LABELS_ES[v].length).toBeGreaterThan(0);
    }
  });

  it("covers every REGION_VALUES entry with an English label", () => {
    for (const v of REGION_VALUES) {
      expect(REGION_LABELS_EN[v]).toBeDefined();
      expect(REGION_LABELS_EN[v].length).toBeGreaterThan(0);
    }
  });

  it("regionLabel returns the Spanish label for locale es", () => {
    expect(regionLabel("madrid", "es")).toBe("Madrid");
    expect(regionLabel("catalunya", "es")).toBe("Catalunya");
    expect(regionLabel("pais-vasco", "es")).toBe("País Vasco");
  });

  it("regionLabel returns the English label for locale en", () => {
    expect(regionLabel("madrid", "en")).toBe("Madrid");
    expect(regionLabel("catalunya", "en")).toBe("Catalonia");
    expect(regionLabel("pais-vasco", "en")).toBe("Basque Country");
  });

  it("REGION_VALUES has exactly 19 CCAA + 1 international = 20 entries", () => {
    expect(REGION_VALUES).toHaveLength(20);
    expect(REGION_VALUES).toContain("international");
  });

  it("TYPE_VALUES covers workshop/homologation/parts/media", () => {
    expect(TYPE_VALUES).toEqual(["workshop", "homologation", "parts", "media"]);
  });
});
