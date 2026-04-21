import type { Locale } from "@/i18n/config";
import { altLocale, altPath } from "@/i18n/config";
import type { Thing, WithContext } from "schema-dts";

interface GetMetaTagsOptions {
  title: string;
  description: string;
  locale: Locale;
  path: string;
  image?: string;
  /**
   * Optional JSON-LD object(s) to embed in <head>.
   * BaseLayout wraps these in a single @graph script tag (W-03 fix).
   */
  jsonLd?: WithContext<Thing> | WithContext<Thing>[];
}

interface HreflangAlternate {
  hreflang: string;
  href: string;
}

interface MetaTags {
  title: string;
  description: string;
  canonical: string;
  alternates: HreflangAlternate[];
  xDefault: string;
  image?: string;
  jsonLd?: WithContext<Thing> | WithContext<Thing>[];
}

/**
 * Compute all SEO meta tags for a given page.
 *
 * Returns canonical URL, hreflang alternates (es-ES + en-US + x-default),
 * OG/Twitter data, image, and optional JSON-LD. All URLs are absolute.
 */
export function getMetaTags({
  title,
  description,
  locale,
  path,
  image,
  jsonLd,
}: GetMetaTagsOptions): MetaTags {
  const site =
    (import.meta.env?.PUBLIC_SITE_URL as string | undefined) ?? "https://jinba.example.com";
  const canonical = new URL(path, site).toString();
  const other = altLocale(locale);
  const otherPath = altPath(path, other);

  const hreflangFor = (l: Locale): string => (l === "es" ? "es-ES" : "en-US");

  const alternates: HreflangAlternate[] = [
    { hreflang: hreflangFor(locale), href: canonical },
    { hreflang: hreflangFor(other), href: new URL(otherPath, site).toString() },
  ];

  // x-default always points to the ES (primary) version
  const xDefault = new URL(altPath(path, "es"), site).toString();

  return { title, description, canonical, alternates, xDefault, image, jsonLd };
}
