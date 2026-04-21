import type { Locale } from "./config";
import { type Dict, DictSchema, es } from "./es";

export const en: Dict = DictSchema.parse({
  "nav.home": "Home",
  "nav.models": "Models",
  "nav.guides": "Guides",
  "nav.services": "Shops",
  "home.title": "Jinba — soulful cars, real data",
  "home.subtitle": "Live prices, editorial guides, and trusted workshops.",
  "home.cta.signup": "Join the list",
  "home.cta.placeholder": "you@email.com",
  "footer.legal": "Legal",
  "footer.imagery": "Imagery policy",
  "theme.toggle": "Toggle theme",
  "theme.labelLight": "Light",
  "theme.labelDark": "Dark",
  "form.error.invalidEmail": "Please enter a valid email.",
  "form.success.signup": "Thanks! We'll let you know when we launch.",

  // ── model page ──
  "model.hero.years": "{start}–{end}",
  "model.hero.chassis": "Chassis {code}",
  "model.hero.generation": "Generation",
  "model.spec.power": "Power",
  "model.spec.engine": "Engine",
  "model.spec.notAvailable": "N/A",
  "model.toc.overview": "Overview",
  "model.toc.buying_guide": "Buying guide",
  "model.toc.common_faults": "Common faults",
  "model.toc.modifications": "Modifications",
  "model.toc.open": "Table of contents",
  "model.toc.close": "Close contents",
  "model.stats.median_price": "Median price",
  "model.stats.price_range": "p25–p75 range",
  "model.stats.listing_count": "listings",
  "model.stats.last_30_days": "last 30 days",
  "model.stats.empty": "Not enough data yet for this model.",
  "model.faults.heading": "Known faults",
  "model.faults.severity.low": "Low",
  "model.faults.severity.med": "Med",
  "model.faults.severity.high": "High",
  "model.faults.cost_range": "Repair: {min}–{max} €",
  "model.mods.heading": "Common modifications",
  "model.mods.legality.legal": "Legal",
  "model.mods.legality.homologable": "Homologable",
  "model.mods.legality.illegal": "Illegal",
  "model.related.heading": "Live listings",
  "model.related.view_all": "View all",
  "model.footer.other_gens": "Other generations",
  "seo.modelPageTitle": "{gen} — Prices & Spec | Jinba",
  "seo.defaultDescription": "Data, live prices, buying guide, common faults and modifications.",
  "section.comingSoon": "Content coming soon.",
});

const DICTS = { es, en } as const satisfies Record<Locale, Dict>;

/**
 * Returns a typed translation accessor for the given locale.
 * Usage: const tr = t("es"); tr("home.title")
 */
export function t(locale: Locale): (key: keyof Dict) => string {
  return (key) => DICTS[locale][key];
}
