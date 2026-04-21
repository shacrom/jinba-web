/**
 * model-types.ts — shared interfaces used across model page components.
 * T15: These are editorial/UI types, not direct DB row types.
 */

export interface LocalizedTaxon {
  id: number;
  slug: string;
  name_es: string;
  name_en: string;
  /** Resolved display name for the current locale — set by the page before passing down */
  name: string;
}

/** Shape of a single fault entry (maps to modelFaults collection schema data) */
export interface FaultEntry {
  severity: "low" | "med" | "high";
  cost_eur_min: number;
  cost_eur_max: number;
  frequency: string;
  description: string;
}

/** Shape of a single mod entry (maps to modelMods collection schema data) */
export interface ModEntry {
  category: string;
  legality: "legal" | "homologable" | "illegal";
  cost_eur_min: number;
  cost_eur_max: number;
  description: string;
}

/** A trim row as resolved for display in SpecBand */
export interface TrimDisplay {
  name: string;
  powerHp: number | null;
  engineCode: string | null;
}

/** Sibling generation link used in ModelFooter */
export interface SiblingGen {
  url: string;
  name: string;
  years: string;
}

/** Hero image shape */
export interface HeroImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}
