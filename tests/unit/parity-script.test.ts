import { mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
/**
 * parity-script.test.ts — T35
 * Tests for checkParity() logic from check-model-mdx-parity.ts.
 * Uses a temp directory fixture to avoid touching the real content tree.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkParity } from "../../scripts/check-model-mdx-parity";

const SECTIONS = ["overview", "buying-guide", "common-faults", "modifications"] as const;
const LOCALES = ["es", "en"] as const;

let testDir: string;

function makeAllFiles(contentDir: string, make: string, model: string, gen: string): void {
  const base = join(contentDir, make, model, gen);
  mkdirSync(base, { recursive: true });
  for (const section of SECTIONS) {
    for (const locale of LOCALES) {
      writeFileSync(join(base, `${section}.${locale}.mdx`), "---\ntitle: test\n---\ntest");
    }
  }
}

beforeAll(() => {
  testDir = join(tmpdir(), `jinba-parity-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("checkParity", () => {
  it("returns empty array when all files are present", () => {
    const contentDir = join(testDir, "all-present");
    const seed = [
      { make: "mazda", model: "mx-5", gen: "na" },
      { make: "datsun", model: "240z", gen: "s30" },
    ];
    for (const entry of seed) {
      makeAllFiles(contentDir, entry.make, entry.model, entry.gen);
    }
    const missing = checkParity(seed, contentDir);
    expect(missing).toHaveLength(0);
  });

  it("returns missing file path when one file is absent", () => {
    const contentDir = join(testDir, "one-missing");
    const seed = [{ make: "seat", model: "leon", gen: "mk1" }];
    makeAllFiles(contentDir, "seat", "leon", "mk1");

    // Delete one file
    unlinkSync(join(contentDir, "seat", "leon", "mk1", "buying-guide.es.mdx"));

    const missing = checkParity(seed, contentDir);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain("buying-guide.es.mdx");
  });

  it("skips a generation when _skip marker is present", () => {
    const contentDir = join(testDir, "with-skip");
    const seed = [
      { make: "volkswagen", model: "golf", gen: "mk4" },
      { make: "audi", model: "a3", gen: "8p" },
    ];
    // Only create audi files; put _skip marker for golf
    const golfDir = join(contentDir, "volkswagen", "golf", "mk4");
    mkdirSync(golfDir, { recursive: true });
    writeFileSync(join(golfDir, "_skip"), "");
    makeAllFiles(contentDir, "audi", "a3", "8p");

    const missing = checkParity(seed, contentDir);
    expect(missing).toHaveLength(0);
  });

  it("reports multiple missing files", () => {
    const contentDir = join(testDir, "multiple-missing");
    const seed = [{ make: "mazda", model: "miata", gen: "nb" }];
    mkdirSync(join(contentDir, "mazda", "miata", "nb"), { recursive: true });
    // Only create one file
    writeFileSync(
      join(contentDir, "mazda", "miata", "nb", "overview.es.mdx"),
      "---\ntitle: test\n---\n"
    );

    const missing = checkParity(seed, contentDir);
    // 4 sections × 2 locales − 1 created = 7 missing
    expect(missing.length).toBe(7);
  });
});
