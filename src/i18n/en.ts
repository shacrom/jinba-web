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

  // ── home page (M1) ──
  "home.cta.exploreModels": "Explore models",
  "home.cta.viewListings": "View listings",
  "home.hero.imageAlt": "Soulful classic cars — Jinba catalog",
  "home.featuredModels.heading": "Featured models",
  "home.featuredGuides.heading": "Editorial guides",
  "home.featuredGuides.noneYet": "More editorial guides coming soon.",
  "home.latestListings.heading": "Latest listings",
  "home.latestListings.viewAll": "View all listings",
  "home.manifesto.heading": "Why Jinba",
  "home.manifesto.body":
    "Jinba gathers the cars we love and tells their story the way it deserves: editorial fact sheets, real prices, and photos with private data scrubbed.\n\nWe scrape with respect and publish with care. What you see here are soulful cars, live data, and trusted workshops.",
  "home.signup.heading": "Join the list",
  "home.signup.body":
    "We'll let you know when new sections open and when the cars we love the most appear.",

  // ── listings pages (M3) ──
  "listings.pageTitle": "Used car listings | Jinba",
  "listings.pageDescription":
    "Browse all used car listings on Jinba. Filter by price, year, mileage and more.",
  "listings.segmented.pageTitle": "{make} {model} {gen} — Listings | Jinba",
  "listings.segmented.pageDescription":
    "All {make} {model} {gen} listings for sale. Filter by price, year and mileage.",
  "listings.detail.pageTitle": "{make} {model} {year} — Listing | Jinba",
  "listings.detail.pageDescription":
    "View listing: {make} {model} {year}, {price}. {km} km. {location}.",
  // filter labels
  "listings.filter.heading": "Filters",
  "listings.filter.priceMin": "Min price",
  "listings.filter.priceMax": "Max price",
  "listings.filter.yearMin": "Min year",
  "listings.filter.yearMax": "Max year",
  "listings.filter.kmMax": "Max km",
  "listings.filter.status": "Status",
  "listings.filter.source": "Portal",
  "listings.filter.apply": "Apply filters",
  "listings.filter.clear": "Clear",
  "listings.filter.openDrawer": "Open filters",
  "listings.filter.closeDrawer": "Close filters",
  // sort labels
  "listings.sort.label": "Sort",
  "listings.sort.lastSeen": "Most recent",
  "listings.sort.priceAsc": "Price: low to high",
  "listings.sort.priceDesc": "Price: high to low",
  // empty state
  "listings.empty.heading": "No listings",
  "listings.empty.body": "No listings match your current filters.",
  "listings.empty.cta": "Notify me when there are",
  // pagination
  "listings.pagination.prev": "Previous",
  "listings.pagination.next": "Next",
  "listings.pagination.page": "Page {page}",
  // detail specs
  "listings.detail.year": "Year",
  "listings.detail.km": "Mileage",
  "listings.detail.price": "Price",
  "listings.detail.source": "Portal",
  "listings.detail.status": "Status",
  "listings.detail.extCta": "View original listing",
  // gallery
  "listings.gallery.slide": "{current} / {total}",
  "listings.gallery.prev": "Previous photo",
  "listings.gallery.next": "Next photo",
  // source badge
  "listings.source.unknown": "Portal",
  // card alt text
  "listings.card.imgAlt": "Photo of {make} {model} {year}",
  // breadcrumb
  "listings.breadcrumb.listings": "Listings",

  // ── price history (M4) ──
  "priceHistory.pageTitle": "Price history — {gen} | Jinba",
  "priceHistory.pageDescription":
    "Median price and p25–p75 range evolution over the last year for this model.",
  "priceHistory.heading": "Price history",
  "priceHistory.empty": "Not enough data yet to show price history.",
  "priceHistory.viewFull": "View full history",
  "priceHistory.ariaLabel":
    "Median price history from {first} to {last}, {from} to {to} ({direction}).",
  "priceHistory.legend.median": "Median price",
  "priceHistory.legend.band": "p25–p75 range",
  "priceHistory.table.heading": "Breakdown by date",
  "priceHistory.table.date": "Date",
  "priceHistory.table.count": "Listings",
  "priceHistory.trend.up": "rising",
  "priceHistory.trend.down": "falling",
  "priceHistory.trend.flat": "stable",

  // ── calculator (M5) ──
  "nav.calculator": "Calculator",
  "calc.pageTitle": "Fair-price calculator | Jinba",
  "calc.pageDescription":
    "Estimate the fair price of a used car based on real listings from the past 90 days.",
  "calc.heading": "Fair-price calculator",
  "calc.subtitle":
    "Pick model, year, mileage, and condition. We return an estimate grounded in current market data.",
  "calc.form.make": "Make",
  "calc.form.model": "Model",
  "calc.form.gen": "Generation",
  "calc.form.trim": "Trim",
  "calc.form.year": "Year",
  "calc.form.km": "Kilometers",
  "calc.form.condition": "Condition",
  "calc.form.submit": "Calculate price",
  "calc.form.loading": "Calculating…",
  "calc.form.errorRequired": "Fill in the required fields to continue.",
  "calc.form.errorGeneric": "We couldn't compute the price. Please try again in a moment.",
  "calc.form.trimAny": "Any trim",
  "calc.condition.excellent": "Excellent",
  "calc.condition.good": "Good",
  "calc.condition.fair": "Fair",
  "calc.condition.rough": "Rough",
  "calc.result.heading": "Estimated fair price",
  "calc.result.estimate": "Estimate",
  "calc.result.range": "Reasonable range",
  "calc.result.basis":
    "Based on {count} listings over the last {days} days (weighted median {median}).",
  "calc.result.unavailable": "Not enough data yet to estimate this price.",
  "calc.result.howItWorks":
    "The estimate is based on the weighted median of listings from the past 90 days, adjusted for mileage (±25%) and condition (±25%).",
  "calc.cta.model": "Estimate for your car",
  "calc.cta.modelBody":
    "Does your car belong to this generation? Get a tailored estimate using your mileage and condition.",
  "calc.cta.modelCtaLabel": "Open calculator",
});

const DICTS = { es, en } as const satisfies Record<Locale, Dict>;

/**
 * Returns a typed translation accessor for the given locale.
 * Usage: const tr = t("es"); tr("home.title")
 */
export function t(locale: Locale): (key: keyof Dict) => string {
  return (key) => DICTS[locale][key];
}
