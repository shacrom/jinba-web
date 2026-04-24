#!/usr/bin/env tsx
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const target = resolve("src/types/database.ts");
const fromEnv = process.env.JINBA_DB_PATH;
const candidates = [fromEnv, "../jinba-db/types/database.ts"].filter(Boolean) as string[];

for (const c of candidates) {
  let abs = resolve(c);
  if (!existsSync(abs)) continue;
  // Accept either a directory (jinba-db repo root) or a direct file path.
  if (statSync(abs).isDirectory()) abs = join(abs, "types/database.ts");
  if (!existsSync(abs)) continue;

  const content = readFileSync(abs, "utf8");

  // Guard: don't overwrite a working shim with an empty-DB placeholder.
  const empty =
    content.includes("Record<string, never>") ||
    content.includes("Tables: {\n      [_ in never]: never") ||
    content.includes("Tables: { [_ in never]: never");
  if (empty) {
    console.warn(`types:sync — upstream at ${abs} has no tables; keeping local shim.`);
    process.exit(0);
  }

  mkdirSync(dirname(target), { recursive: true });
  // Header uses a stable reference ("jinba-db") rather than the resolved path
  // so the committed file is identical across environments (local sync with
  // JINBA_DB_PATH=../jinba-db vs CI sync with a clone under /home/runner/...).
  // The CI drift check compares byte-for-byte, so any path variance fails it.
  writeFileSync(
    target,
    `// AUTO-SYNCED from jinba-db — do not edit by hand\n// Run \`npm run types:sync\` to refresh.\n${content}`
  );
  console.log(`types:sync OK — copied from ${abs}`);
  process.exit(0);
}

// No source found — write or keep shim
if (!existsSync(target)) {
  const shim = `// AUTO-SYNCED placeholder shim — do not edit by hand.
// Run \`npm run types:sync\` once jinba-db is available (set JINBA_DB_PATH or place at ../jinba-db/types/database.ts).
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
`;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, shim);
  console.warn("types:sync — no source found; wrote placeholder shim.");
  process.exit(0);
}

console.log("types:sync — no source found; keeping committed shim.");
process.exit(0);
