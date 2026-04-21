import { en } from "./en";
import { es } from "./es";

/**
 * Computes the symmetric diff between ES and EN dictionary keys.
 * Used by both the vitest parity test and the CI script.
 */
export function diffKeys(): { missingInEn: string[]; missingInEs: string[] } {
  const ek = new Set(Object.keys(es));
  const nk = new Set(Object.keys(en));
  const missingInEn = [...ek].filter((k) => !nk.has(k));
  const missingInEs = [...nk].filter((k) => !ek.has(k));
  return { missingInEn, missingInEs };
}
