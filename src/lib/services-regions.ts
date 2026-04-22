/**
 * services-regions.ts — M7 T01
 *
 * Single source of truth for:
 *  - `REGION_VALUES` (Spanish CCAA + "international") used by the Zod enum in
 *    `src/content.config.ts` and the UI filter.
 *  - `TYPE_VALUES` (`workshop`|`homologation`|`parts`|`media`) — same pattern.
 *  - Locale-keyed label maps rendered in UI (not in the i18n dict because they
 *    are proper nouns that rarely change and don't vary by UX copy).
 */
import type { Locale } from "@/i18n/config";

export const REGION_VALUES = [
  "andalucia",
  "aragon",
  "asturias",
  "cantabria",
  "castilla-leon",
  "castilla-la-mancha",
  "catalunya",
  "extremadura",
  "galicia",
  "baleares",
  "canarias",
  "rioja",
  "madrid",
  "murcia",
  "navarra",
  "pais-vasco",
  "valencia",
  "ceuta",
  "melilla",
  "international",
] as const;

export type Region = (typeof REGION_VALUES)[number];

export const TYPE_VALUES = ["workshop", "homologation", "parts", "media"] as const;
export type ServiceType = (typeof TYPE_VALUES)[number];

export const REGION_LABELS_ES: Record<Region, string> = {
  andalucia: "Andalucía",
  aragon: "Aragón",
  asturias: "Asturias",
  cantabria: "Cantabria",
  "castilla-leon": "Castilla y León",
  "castilla-la-mancha": "Castilla-La Mancha",
  catalunya: "Catalunya",
  extremadura: "Extremadura",
  galicia: "Galicia",
  baleares: "Illes Balears",
  canarias: "Canarias",
  rioja: "La Rioja",
  madrid: "Madrid",
  murcia: "Murcia",
  navarra: "Navarra",
  "pais-vasco": "País Vasco",
  valencia: "Comunitat Valenciana",
  ceuta: "Ceuta",
  melilla: "Melilla",
  international: "Internacional",
};

export const REGION_LABELS_EN: Record<Region, string> = {
  andalucia: "Andalusia",
  aragon: "Aragon",
  asturias: "Asturias",
  cantabria: "Cantabria",
  "castilla-leon": "Castile and León",
  "castilla-la-mancha": "Castile-La Mancha",
  catalunya: "Catalonia",
  extremadura: "Extremadura",
  galicia: "Galicia",
  baleares: "Balearic Islands",
  canarias: "Canary Islands",
  rioja: "La Rioja",
  madrid: "Madrid",
  murcia: "Murcia",
  navarra: "Navarre",
  "pais-vasco": "Basque Country",
  valencia: "Valencia Region",
  ceuta: "Ceuta",
  melilla: "Melilla",
  international: "International",
};

/** Returns the human-readable region label for the active locale. */
export function regionLabel(region: Region, locale: Locale): string {
  return locale === "es" ? REGION_LABELS_ES[region] : REGION_LABELS_EN[region];
}
