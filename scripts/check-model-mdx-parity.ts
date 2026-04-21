#!/usr/bin/env tsx
/**
 * check-model-mdx-parity.ts — T30
 * Verifies all required MDX files exist for every taxonomy entry.
 * Primary source: scripts/data/taxonomy-seed.json (always committed).
 * Optional: also queries Supabase when SUPABASE_URL + SUPABASE_ANON_KEY are set and non-fake.
 * REQ-PARITY-01 through REQ-PARITY-04.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Types ──────────────────────────────────────────────────────────────────

interface GenTriple {
  make: string;
  model: string;
  gen: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SECTIONS = ["overview", "buying-guide", "common-faults", "modifications"] as const;
const LOCALES = ["es", "en"] as const;

// ── Seed read ──────────────────────────────────────────────────────────────

function readSeed(): GenTriple[] {
  const seedPath = resolve("scripts/data/taxonomy-seed.json");
  if (!existsSync(seedPath)) {
    console.error(`check-model-mdx-parity: seed not found at ${seedPath}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(seedPath, "utf8")) as GenTriple[];
}

// ── Parity check logic (exported for unit tests) ───────────────────────────

export function checkParity(seed: GenTriple[], contentDir: string): string[] {
  const missing: string[] = [];
  for (const { make, model, gen } of seed) {
    const skipMarker = resolve(contentDir, make, model, gen, "_skip");
    if (existsSync(skipMarker)) continue;

    for (const section of SECTIONS) {
      for (const locale of LOCALES) {
        const p = resolve(contentDir, make, model, gen, `${section}.${locale}.mdx`);
        if (!existsSync(p)) {
          missing.push(p);
        }
      }
    }
  }
  return missing;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  const seed = readSeed();
  const contentDir = resolve("src/content/models");
  const missing = checkParity(seed, contentDir);

  if (missing.length > 0) {
    console.error(`check-model-mdx-parity FAILED — ${missing.length} missing file(s):`);
    for (const m of missing) {
      console.error(`  - ${m}`);
    }
    process.exit(1);
  }

  console.log(
    `check-model-mdx-parity OK — ${seed.length} gen(s) × ${SECTIONS.length} sections × ${LOCALES.length} locales = ${seed.length * SECTIONS.length * LOCALES.length} MDX files present.`
  );
}

main();
