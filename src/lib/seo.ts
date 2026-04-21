import type { Locale } from "@/i18n/config";
import { altLocale, altPath } from "@/i18n/config";

interface GetMetaTagsOptions {
  title: string;
  description: string;
  locale: Locale;
  path: string;
  image?: string;
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
}

/**
 * Compute all SEO meta tags for a given page.
 *
 * Returns canonical URL, hreflang alternates (es-ES + en-US + x-default),
 * OG/Twitter data, and image. All URLs are absolute.
 */
export function getMetaTags({
  title,
  description,
  locale,
  path,
  image,
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

  return { title, description, canonical, alternates, xDefault, image };
}
