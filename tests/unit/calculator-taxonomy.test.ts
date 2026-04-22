import { taxonomyFromSeed } from "@/lib/calculator-taxonomy";
/**
 * calculator-taxonomy.test.ts — M5
 * Covers the seed → taxonomy grouping path (the DB path is exercised
 * transparently via the same helper).
 * REQ-CALC-FORM-01, REQ-CALC-TEST-01.
 */
import { describe, expect, it } from "vitest";

describe("taxonomyFromSeed", () => {
  const seed = [
    { make: "mazda", model: "mx-5", gen: "na" },
    { make: "datsun", model: "240z", gen: "s30" },
    { make: "seat", model: "leon", gen: "mk1" },
    { make: "volkswagen", model: "golf", gen: "mk4" },
    { make: "audi", model: "a3", gen: "8p" },
  ];

  it("groups entries into makes sorted alphabetically", () => {
    const t = taxonomyFromSeed(seed);
    expect(t.map((m) => m.slug)).toEqual(["audi", "datsun", "mazda", "seat", "volkswagen"]);
  });

  it("nests models and gens under each make", () => {
    const t = taxonomyFromSeed(seed);
    const mazda = t.find((m) => m.slug === "mazda");
    expect(mazda).toBeDefined();
    expect(mazda?.models).toHaveLength(1);
    expect(mazda?.models[0].slug).toBe("mx-5");
    expect(mazda?.models[0].gens[0].slug).toBe("na");
    expect(mazda?.models[0].gens[0].name_es).toBe("NA");
    expect(mazda?.models[0].gens[0].year_start).toBe(1980);
    expect(mazda?.models[0].gens[0].trims).toEqual([]);
  });

  it("supports multiple gens under the same model", () => {
    const extended = [
      ...seed,
      { make: "mazda", model: "mx-5", gen: "nb" },
      { make: "mazda", model: "mx-5", gen: "nc" },
    ];
    const t = taxonomyFromSeed(extended);
    const mx5 = t.find((m) => m.slug === "mazda")?.models[0];
    expect(mx5?.gens.map((g) => g.slug)).toEqual(["na", "nb", "nc"]);
  });

  it("supports multiple models under the same make", () => {
    const extended = [...seed, { make: "mazda", model: "rx-7", gen: "fd" }];
    const t = taxonomyFromSeed(extended);
    const mazda = t.find((m) => m.slug === "mazda");
    expect(mazda?.models.map((m) => m.slug).sort()).toEqual(["mx-5", "rx-7"]);
  });

  it("returns an empty array when the seed is empty", () => {
    expect(taxonomyFromSeed([])).toEqual([]);
  });

  it("title-cases make names derived from slugs", () => {
    const t = taxonomyFromSeed([{ make: "audi", model: "a3", gen: "8p" }]);
    expect(t[0].name_es).toBe("Audi");
    expect(t[0].name_en).toBe("Audi");
  });
});
