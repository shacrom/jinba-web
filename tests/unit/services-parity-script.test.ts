import { mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
/**
 * services-parity-script.test.ts — M7 T18
 * Tests for checkParity() logic from check-services-mdx-parity.ts.
 * Uses a temp directory fixture to avoid touching the real content tree.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkParity } from "../../scripts/check-services-mdx-parity";

const LOCALES = ["es", "en"] as const;

let testDir: string;

function makeLocales(contentDir: string, slug: string): void {
  mkdirSync(contentDir, { recursive: true });
  for (const locale of LOCALES) {
    writeFileSync(
      join(contentDir, `${slug}.${locale}.mdx`),
      `---\ntitle: test\nlocale: ${locale}\n---\n`
    );
  }
}

beforeAll(() => {
  testDir = join(tmpdir(), `jinba-services-parity-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("checkParity (services)", () => {
  it("returns empty array when every (slug, locale) pair exists", () => {
    const contentDir = join(testDir, "all-present");
    const seed = [{ slug: "taller-madrid" }, { slug: "piezas-andalucia" }];
    for (const { slug } of seed) makeLocales(contentDir, slug);

    const missing = checkParity(seed, contentDir);
    expect(missing).toHaveLength(0);
  });

  it("returns missing path when one locale is absent", () => {
    const contentDir = join(testDir, "one-missing");
    const seed = [{ slug: "homologa-valencia" }];
    makeLocales(contentDir, "homologa-valencia");

    unlinkSync(join(contentDir, "homologa-valencia.en.mdx"));

    const missing = checkParity(seed, contentDir);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain("homologa-valencia.en.mdx");
  });

  it("reports both missing pairs when a brand-new slug has zero files", () => {
    const contentDir = join(testDir, "all-missing");
    mkdirSync(contentDir, { recursive: true });
    const seed = [{ slug: "piezas-canarias" }];

    const missing = checkParity(seed, contentDir);
    expect(missing).toHaveLength(2);
    expect(missing.some((p) => p.endsWith("piezas-canarias.es.mdx"))).toBe(true);
    expect(missing.some((p) => p.endsWith("piezas-canarias.en.mdx"))).toBe(true);
  });

  it("handles an empty seed list gracefully", () => {
    const contentDir = join(testDir, "empty-seed");
    mkdirSync(contentDir, { recursive: true });
    const missing = checkParity([], contentDir);
    expect(missing).toHaveLength(0);
  });
});
