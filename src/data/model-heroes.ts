/**
 * model-heroes.ts
 *
 * Canonical hero image registry for the model detail page. Keyed by
 * `${make}:${model}:${gen}`. Images are self-hosted under /public/images/
 * (downloaded from Wikimedia Commons under the attribution preserved in
 * `credit`). The model page renders the image first, with a small credit
 * line underneath — this is the legal requirement for CC-BY-SA reuse.
 */

export interface ModelHero {
  /** Absolute path under /public. */
  image: string;
  /** Intrinsic dimensions — prevents CLS. Approximate is fine: CSS clips to aspect-video. */
  width: number;
  height: number;
  /** Short alt text used by screen readers. */
  alt: string;
  /** Attribution line rendered under the image. Mandatory for CC-BY / CC-BY-SA. */
  credit: string;
  /** Link back to the file page on Commons. Used by the credit link. */
  source_url: string;
}

type HeroKey = `${string}:${string}:${string}`;

export const MODEL_HEROES: Record<HeroKey, ModelHero> = {
  "mazda:mx-5:na": {
    image: "/images/models/mazda/mx-5/na/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Mazda MX-5 (NA) — primera generación",
    credit: "Mazda Roadster (MX-5) by Negawa Bridge · Wikimedia Commons · CC BY-SA",
    source_url:
      "https://commons.wikimedia.org/wiki/File:Mazda_Roadster_(MX-5)_by_Negawa_Bridge_(cropped).jpg",
  },
  "datsun:240z:s30": {
    image: "/images/models/datsun/240z/s30/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Datsun 240Z (S30) 1970-1973",
    credit: "1970-1973 Nissan Fairlady Z · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:1970-1973_Nissan_Fairlady_Z.jpg",
  },
  "seat:leon:mk1": {
    image: "/images/models/seat/leon/mk1/hero.jpg",
    width: 1600,
    height: 900,
    alt: "SEAT León 1M (Mk1)",
    credit: "Seat Leon 1M FR · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:Seat_Leon_1M_FR.JPG",
  },
  "seat:leon:mk2": {
    image: "/images/models/seat/leon/mk2/hero.jpg",
    width: 1600,
    height: 900,
    alt: "SEAT León 1P (Mk2)",
    credit: "SEAT Leon 1P · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:SEAT_Leon_1P_upper_view.jpg",
  },
  "seat:ibiza:mk4": {
    image: "/images/models/seat/ibiza/mk4/hero.jpg",
    width: 1600,
    height: 900,
    alt: "SEAT Ibiza 6J Cupra (Mk4)",
    credit: "SEAT Ibiza 6J Cupra · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:SEAT_Ibiza_6J_Cupra.jpg",
  },
  "volkswagen:golf:mk4": {
    image: "/images/models/volkswagen/golf/mk4/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Volkswagen Golf IV (Mk4)",
    credit: "Golf 4 1.4 · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:Golf4_1.4.jpg",
  },
  "volkswagen:polo:mk5": {
    image: "/images/models/volkswagen/polo/mk5/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Volkswagen Polo 6R (Mk5)",
    credit: "Volkswagen Polo 6R · Wikimedia Commons · CC BY-SA",
    source_url:
      "https://commons.wikimedia.org/wiki/File:2010-2011_Volkswagen_Polo_(6R)_77TSI_Comfortline_5-door_hatchback_(2011-11-18)_01.jpg",
  },
  "audi:a3:8p": {
    image: "/images/models/audi/a3/8p/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Audi A3 8P",
    credit: "Audi A3 8P · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:Audi_A3_8P_Vorn.JPG",
  },
  "audi:rs6:c7": {
    image: "/images/models/audi/rs6/c7/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Audi RS6 Avant (C7)",
    credit: "Audi RS6 (C7) Avant · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:Audi_RS6_(C7)_Avant_(24418339396).jpg",
  },
  "renault:megane:mk3": {
    image: "/images/models/renault/megane/mk3/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Renault Mégane III",
    credit: "2010 Renault Megane · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:2010_Renault_Megane_(14748393207).jpg",
  },
  "renault:clio:mk4": {
    image: "/images/models/renault/clio/mk4/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Renault Clio IV",
    credit: "2013 Renault Clio IV Dynamique · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:2013_Renault_Clio_IV_Dynamique_(1).jpg",
  },
  "ford:focus:mk2": {
    image: "/images/models/ford/focus/mk2/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Ford Focus II (Mk2)",
    credit: "Ford Focus II 1.6 Ghia · Wikimedia Commons · CC BY-SA",
    source_url:
      "https://commons.wikimedia.org/wiki/File:Ford_Focus_II_1.6_Ghia_4d_A_(NGL-850)_in_Haukilahti,_Espoo_(September_2019,_7).jpg",
  },
  "opel:astra:j": {
    image: "/images/models/opel/astra/j/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Opel Astra J",
    credit: "2010 Opel Astra J · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:2010_Opel_Astra_J_(netherlands).jpg",
  },
  "peugeot:308:mk1": {
    image: "/images/models/peugeot/308/mk1/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Peugeot 308 T7 (Mk1)",
    credit: "2008-2010 Peugeot 308 (T7) XSE Touring · Wikimedia Commons · CC BY-SA",
    source_url:
      "https://commons.wikimedia.org/wiki/File:2008-2010_Peugeot_308_(T7)_XSE_Touring_(2015-11-06).jpg",
  },
  "bmw:serie-3:e90": {
    image: "/images/models/bmw/serie-3/e90/hero.jpg",
    width: 1600,
    height: 900,
    alt: "BMW 320i Serie 3 (E90)",
    credit: "2005-2008 BMW 320i (E90) sedan · Wikimedia Commons · CC BY-SA",
    source_url:
      "https://commons.wikimedia.org/wiki/File:2005-2008_BMW_320i_(E90)_sedan_(2011-07-17)_01.jpg",
  },
  "dacia:sandero:mk2": {
    image: "/images/models/dacia/sandero/mk2/hero.jpg",
    width: 1600,
    height: 900,
    alt: "Dacia Sandero II (Mk2)",
    credit: "Dacia Sandero II · Wikimedia Commons · CC BY-SA",
    source_url: "https://commons.wikimedia.org/wiki/File:Dacia_Sandero_II_(26078).jpg",
  },
};

/**
 * Resolves a hero image for a given (make, model, gen) tuple.
 * Returns null when no registry entry exists — the caller falls back to
 * the Supabase listings photo or the static placeholder.
 */
export function getModelHero(make: string, model: string, gen: string): ModelHero | null {
  const key = `${make}:${model}:${gen}` as HeroKey;
  return MODEL_HEROES[key] ?? null;
}
