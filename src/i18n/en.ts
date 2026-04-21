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
});

const DICTS = { es, en } as const satisfies Record<Locale, Dict>;

/**
 * Returns a typed translation accessor for the given locale.
 * Usage: const tr = t("es"); tr("home.title")
 */
export function t(locale: Locale): (key: keyof Dict) => string {
  return (key) => DICTS[locale][key];
}
