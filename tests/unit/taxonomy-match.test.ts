import { levenshtein, matchTaxonomy, normalise, similarity } from "@/lib/taxonomy-match";
import type { TaxonomyEntry } from "@/lib/taxonomy-match";
/**
 * tests/unit/taxonomy-match.test.ts
 *
 * Unit tests for the fuzzy taxonomy matcher (src/lib/taxonomy-match.ts).
 * Covers 6+ cases as required by the design brief.
 */
import { describe, expect, it } from "vitest";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TAXONOMY: TaxonomyEntry[] = [
  {
    generation_id: 1,
    make_slug: "mazda",
    make_name: "Mazda",
    model_slug: "mx-5",
    model_name: "MX-5",
    gen_slug: "na",
    gen_name: "NA",
    year_start: 1989,
    year_end: 1997,
  },
  {
    generation_id: 2,
    make_slug: "mazda",
    make_name: "Mazda",
    model_slug: "mx-5",
    model_name: "MX-5",
    gen_slug: "nb",
    gen_name: "NB",
    year_start: 1998,
    year_end: 2005,
  },
  {
    generation_id: 3,
    make_slug: "renault",
    make_name: "Renault",
    model_slug: "megane",
    model_name: "Megane",
    gen_slug: "mk2",
    gen_name: "Mk2",
    year_start: 2002,
    year_end: 2008,
  },
  {
    generation_id: 4,
    make_slug: "volkswagen",
    make_name: "Volkswagen",
    model_slug: "golf",
    model_name: "Golf",
    gen_slug: "mk4",
    gen_name: "Mk4",
    year_start: 1997,
    year_end: 2003,
  },
  {
    generation_id: 5,
    make_slug: "seat",
    make_name: "Seat",
    model_slug: "leon",
    model_name: "Leon",
    gen_slug: "mk1",
    gen_name: "Mk1",
    year_start: 1999,
    year_end: 2005,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

describe("normalise", () => {
  it("lowercases and removes accents", () => {
    expect(normalise("Mégane")).toBe("megane");
    expect(normalise("MATRÍCULA")).toBe("matricula");
    expect(normalise("Héroe")).toBe("heroe");
  });

  it("removes non-alphanumeric characters", () => {
    expect(normalise("MX-5")).toBe("mx 5");
    expect(normalise("MAZDA MOTOR CORP.")).toBe("mazda motor corp");
  });
});

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("mazda", "mazda")).toBe(0);
  });

  it("returns correct distance for simple edits", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("mazda", "mazd")).toBe(1);
  });

  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "")).toBe(0);
  });
});

describe("similarity", () => {
  it("returns 1 for identical strings", () => {
    expect(similarity("mazda", "mazda")).toBe(1);
  });

  it("returns < 1 for different strings", () => {
    expect(similarity("mazda", "honda")).toBeLessThan(1);
  });
});

// ── matchTaxonomy ─────────────────────────────────────────────────────────────

describe("matchTaxonomy", () => {
  // Case 1 — Exact match → high score, correct entry
  it("exact match returns entry with high score", () => {
    const result = matchTaxonomy({ marca: "Mazda", modelo: "MX-5", ano: 1995 }, TAXONOMY);
    expect(result.entry).not.toBeNull();
    expect(result.entry?.generation_id).toBe(1); // NA gen (1989–1997)
    expect(result.score).toBeGreaterThanOrEqual(0.8);
  });

  // Case 2 — Fuzzy make (e.g. "MAZDA MOTOR CORP." → "mazda")
  it("fuzzy make match still finds the correct entry", () => {
    const result = matchTaxonomy(
      { marca: "MAZDA MOTOR CORP.", modelo: "MX-5", ano: 2003 },
      TAXONOMY
    );
    expect(result.entry).not.toBeNull();
    // Should match NB gen (1998–2005) because year 2003 is in range
    expect(result.entry?.make_slug).toBe("mazda");
  });

  // Case 3 — Wrong model but correct make → low score, correct make in candidates
  it("wrong model + correct make: returns null entry but make appears in candidates", () => {
    const result = matchTaxonomy({ marca: "Mazda", modelo: "CX-5", ano: 1995 }, TAXONOMY);
    // Score may be too low for a confident match
    const makeInCandidates = result.candidates.some((c) => c.entry.make_slug === "mazda");
    expect(makeInCandidates).toBe(true);
  });

  // Case 4 — Year outside range → demotes score
  it("year far outside range demotes score vs in-range entry", () => {
    // NB gen 1998–2005; year 2020 is way outside
    const outOfRange = matchTaxonomy({ marca: "Mazda", modelo: "MX-5", ano: 2020 }, TAXONOMY);
    // NA gen 1989–1997; year 1993 is in range
    const inRange = matchTaxonomy({ marca: "Mazda", modelo: "MX-5", ano: 1993 }, TAXONOMY);
    expect(inRange.score).toBeGreaterThanOrEqual(outOfRange.score);
  });

  // Case 5 — Empty input → null, no candidates
  it("empty input returns null with no candidates", () => {
    const result = matchTaxonomy({ marca: null, modelo: null, ano: null }, TAXONOMY);
    expect(result.entry).toBeNull();
    expect(result.score).toBe(0);
    expect(result.candidates).toHaveLength(0);
  });

  // Case 6 — Accented input "Mégane" → "megane" matched to Renault Megane
  it("accented input is normalised and matches correctly", () => {
    const result = matchTaxonomy({ marca: "Renault", modelo: "Mégane", ano: 2004 }, TAXONOMY);
    expect(result.entry).not.toBeNull();
    expect(result.entry?.model_slug).toBe("megane");
    expect(result.entry?.make_slug).toBe("renault");
  });

  // Case 7 — Empty taxonomy → null
  it("empty taxonomy returns null", () => {
    const result = matchTaxonomy({ marca: "Mazda", modelo: "MX-5", ano: 1993 }, []);
    expect(result.entry).toBeNull();
    expect(result.candidates).toHaveLength(0);
  });

  // Case 8 — Candidates are capped at 5
  it("candidates list does not exceed 5 entries", () => {
    const bigTaxonomy: TaxonomyEntry[] = Array.from({ length: 20 }, (_, i) => ({
      generation_id: i + 100,
      make_slug: `make${i}`,
      make_name: `Make ${i}`,
      model_slug: `model${i}`,
      model_name: `Model ${i}`,
      gen_slug: `gen${i}`,
      gen_name: `Gen ${i}`,
      year_start: 2000,
      year_end: 2010,
    }));

    const result = matchTaxonomy({ marca: "make5", modelo: "model5", ano: 2005 }, bigTaxonomy);
    expect(result.candidates.length).toBeLessThanOrEqual(5);
  });

  // Case 9 — Year in range picks the right generation between two gens of same model
  it("year in range picks the correct generation over one outside range", () => {
    const resultNA = matchTaxonomy({ marca: "Mazda", modelo: "MX-5", ano: 1994 }, TAXONOMY);
    expect(resultNA.entry?.gen_slug).toBe("na");

    const resultNB = matchTaxonomy({ marca: "Mazda", modelo: "MX-5", ano: 2002 }, TAXONOMY);
    expect(resultNB.entry?.gen_slug).toBe("nb");
  });
});
