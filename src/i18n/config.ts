export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

/** Returns the other locale. */
export function altLocale(l: Locale): Locale {
  return l === "es" ? "en" : "es";
}

/**
 * Replaces the leading locale segment of a path.
 * altPath("/es/foo", "en") === "/en/foo"
 * altPath("/es/", "en")   === "/en/"
 * altPath("/en", "es")    === "/es"
 */
export function altPath(path: string, toLocale: Locale): string {
  return path.replace(/^\/(es|en)(\/|$)/, `/${toLocale}$2`);
}
