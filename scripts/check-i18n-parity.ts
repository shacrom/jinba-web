#!/usr/bin/env tsx
import { diffKeys } from "../src/i18n/check-parity.js";

const { missingInEn, missingInEs } = diffKeys();

if (missingInEn.length > 0 || missingInEs.length > 0) {
  console.error("i18n parity FAILED");
  if (missingInEn.length > 0) console.error("  Missing in EN:", missingInEn);
  if (missingInEs.length > 0) console.error("  Missing in ES:", missingInEs);
  process.exit(1);
}

console.log("i18n parity OK");
process.exit(0);
