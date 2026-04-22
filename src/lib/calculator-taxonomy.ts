/**
 * calculator-taxonomy.ts — M5
 * Build-time taxonomy loader for the calculator island.
 * Tries Supabase (anon) first, falls back to the shared taxonomy seed
 * file used by M1/M2/M3 when the DB is unreachable (CI / no .env).
 * The returned structure is a make → model → gen → trim tree ready for
 * cascading selects in `CalculatorForm.tsx`.
 * REQ-CALC-FORM-01.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CalcTaxonomy, CalcTaxonomyMake } from "@/lib/price-estimate-types";
import { supabase } from "@/lib/supabase";

interface SeedEntry {
  make: string;
  model: string;
  gen: string;
}

interface DbGenRow {
  slug: string;
  name_es: string;
  name_en: string;
  year_start: number;
  year_end: number | null;
  trims: Array<{ slug: string; name_es: string; name_en: string }> | null;
  models: {
    slug: string;
    name_es: string;
    name_en: string;
    makes: { slug: string; name_es: string; name_en: string };
  };
}

export async function loadCalcTaxonomy(): Promise<CalcTaxonomy> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("generations")
        .select(
          "slug, name_es, name_en, year_start, year_end, models!inner ( slug, name_es, name_en, makes!inner ( slug, name_es, name_en ) ), trims ( slug, name_es, name_en )"
        );
      if (!error && data && data.length > 0) {
        return groupTaxonomy(data as unknown as DbGenRow[]);
      }
    } catch {
      // fall through to seed
    }
  }
  return loadSeedFallback();
}

/** Exported for unit testing the seed-fallback branch in isolation. */
export function taxonomyFromSeed(seed: SeedEntry[]): CalcTaxonomy {
  const byMake = new Map<string, CalcTaxonomyMake>();
  for (const e of seed) {
    let make = byMake.get(e.make);
    if (!make) {
      make = {
        slug: e.make,
        name_es: titleCase(e.make),
        name_en: titleCase(e.make),
        models: [],
      };
      byMake.set(e.make, make);
    }
    let model = make.models.find((m) => m.slug === e.model);
    if (!model) {
      model = { slug: e.model, name_es: e.model, name_en: e.model, gens: [] };
      make.models.push(model);
    }
    model.gens.push({
      slug: e.gen,
      name_es: e.gen.toUpperCase(),
      name_en: e.gen.toUpperCase(),
      year_start: 1980,
      year_end: null,
      trims: [],
    });
  }
  return [...byMake.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function groupTaxonomy(rows: DbGenRow[]): CalcTaxonomy {
  const byMake = new Map<string, CalcTaxonomyMake>();
  for (const r of rows) {
    const m = r.models.makes;
    let make = byMake.get(m.slug);
    if (!make) {
      make = { slug: m.slug, name_es: m.name_es, name_en: m.name_en, models: [] };
      byMake.set(m.slug, make);
    }
    let model = make.models.find((x) => x.slug === r.models.slug);
    if (!model) {
      model = {
        slug: r.models.slug,
        name_es: r.models.name_es,
        name_en: r.models.name_en,
        gens: [],
      };
      make.models.push(model);
    }
    model.gens.push({
      slug: r.slug,
      name_es: r.name_es,
      name_en: r.name_en,
      year_start: r.year_start,
      year_end: r.year_end,
      trims: (r.trims ?? []).map((t) => ({
        slug: t.slug,
        name_es: t.name_es,
        name_en: t.name_en,
      })),
    });
  }
  return [...byMake.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function loadSeedFallback(): CalcTaxonomy {
  try {
    const p = resolve("scripts/data/taxonomy-seed.json");
    const seed = JSON.parse(readFileSync(p, "utf8")) as SeedEntry[];
    return taxonomyFromSeed(seed);
  } catch {
    return [];
  }
}

function titleCase(slug: string): string {
  if (!slug) return slug;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
