/**
 * src/lib/ingest/targets.ts — D02 (data-sources-strategy)
 *
 * Hard-coded registry of (generation, source) scraping targets for Phase 1-2.
 * 10 head-volume gens × 2 sources = 20 entries.
 *
 * dataset_id fields are "" (empty string placeholders) until USER_ACTION G03:
 * after Apify actors are configured and running, fill each dataset_id with
 * the Apify dataset default-ID for that (gen, source) scheduled actor run.
 * Update via PR so changes are reviewed and diffs are visible.
 *
 * An empty dataset_id causes pullDataset to return 0 rows (Apify returns an
 * empty items array for an empty dataset). The cron run continues normally.
 */
import type { IngestTarget } from "./types";

export const INGEST_TARGETS: IngestTarget[] = [
  // ─── SEAT Ibiza MK4 ──────────────────────────────────────────────────────
  { gen_slug: "seat:ibiza:mk4", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "seat:ibiza:mk4", source_slug: "wallapop", dataset_id: "" },

  // ─── Volkswagen Polo MK5 ─────────────────────────────────────────────────
  { gen_slug: "volkswagen:polo:mk5", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "volkswagen:polo:mk5", source_slug: "wallapop", dataset_id: "" },

  // ─── Opel Corsa D ────────────────────────────────────────────────────────
  { gen_slug: "opel:corsa:d", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "opel:corsa:d", source_slug: "wallapop", dataset_id: "" },

  // ─── Ford Fiesta MK7 ─────────────────────────────────────────────────────
  { gen_slug: "ford:fiesta:mk7", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "ford:fiesta:mk7", source_slug: "wallapop", dataset_id: "" },

  // ─── Renault Clio MK3 ────────────────────────────────────────────────────
  { gen_slug: "renault:clio:mk3", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "renault:clio:mk3", source_slug: "wallapop", dataset_id: "" },

  // ─── Peugeot 206 ─────────────────────────────────────────────────────────
  { gen_slug: "peugeot:206:all", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "peugeot:206:all", source_slug: "wallapop", dataset_id: "" },

  // ─── Citroen C3 MK1 ──────────────────────────────────────────────────────
  { gen_slug: "citroen:c3:mk1", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "citroen:c3:mk1", source_slug: "wallapop", dataset_id: "" },

  // ─── Toyota Yaris MK2 ────────────────────────────────────────────────────
  { gen_slug: "toyota:yaris:mk2", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "toyota:yaris:mk2", source_slug: "wallapop", dataset_id: "" },

  // ─── Hyundai i20 MK1 ─────────────────────────────────────────────────────
  { gen_slug: "hyundai:i20:mk1", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "hyundai:i20:mk1", source_slug: "wallapop", dataset_id: "" },

  // ─── Kia Rio MK3 ─────────────────────────────────────────────────────────
  { gen_slug: "kia:rio:mk3", source_slug: "milanuncios", dataset_id: "" },
  { gen_slug: "kia:rio:mk3", source_slug: "wallapop", dataset_id: "" },
];
