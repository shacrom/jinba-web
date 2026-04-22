#!/usr/bin/env tsx
/**
 * check-services-mdx-parity.ts — M7 T15
 * Verifies every seed service in `scripts/data/services-seed.json` has both
 * `<slug>.es.mdx` AND `<slug>.en.mdx` present in `src/content/services/`.
 * REQ-PARITY-01, REQ-PARITY-02, REQ-PARITY-03.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface ServiceSeed {
  slug: string;
}

const LOCALES = ["es", "en"] as const;

function readSeed(): ServiceSeed[] {
  const seedPath = resolve("scripts/data/services-seed.json");
  if (!existsSync(seedPath)) {
    console.error(`check-services-mdx-parity: seed not found at ${seedPath}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(seedPath, "utf8")) as ServiceSeed[];
}

/**
 * Exported for unit tests. Returns an array of missing file paths; an empty
 * array means every (slug, locale) pair has an MDX file on disk.
 */
export function checkParity(seed: ServiceSeed[], contentDir: string): string[] {
  const missing: string[] = [];
  for (const { slug } of seed) {
    for (const locale of LOCALES) {
      const p = resolve(contentDir, `${slug}.${locale}.mdx`);
      if (!existsSync(p)) missing.push(p);
    }
  }
  return missing;
}

function main(): void {
  const seed = readSeed();
  const contentDir = resolve("src/content/services");
  const missing = checkParity(seed, contentDir);

  if (missing.length > 0) {
    console.error(`check-services-mdx-parity FAILED — ${missing.length} missing file(s):`);
    for (const m of missing) {
      console.error(`  - ${m}`);
    }
    process.exit(1);
  }

  console.log(
    `check-services-mdx-parity OK — ${seed.length} service(s) × ${LOCALES.length} locales = ${seed.length * LOCALES.length} MDX files present.`
  );
}

main();
