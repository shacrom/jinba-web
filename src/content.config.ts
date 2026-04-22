import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const localeField = z.enum(["es", "en"]);
const severityField = z.enum(["low", "med", "high"]);
const legalityField = z.enum(["legal", "homologable", "illegal"]);
// M7: services schema fields
const serviceTypeField = z.enum(["workshop", "homologation", "parts", "media"]);
const regionField = z.enum([
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
]);
// E.164-ish: optional leading `+`, digits and spaces only, 6–20 chars.
const phoneField = z.string().regex(/^\+?[0-9 ]{6,20}$/);

const guides = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/guides" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: localeField,
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    cover: z.string().optional(),
    // M6 editorial fields — all optional, additive extension
    cover_image: z.string().optional(),
    author: z.string().optional(),
    reading_time_min: z.number().int().positive().optional(),
    published_at: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

// T01: Extended models collection with section discriminator + editorial fields
const models = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/models" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: localeField,
    make: z.string(),
    model: z.string(),
    generation: z.string(),
    trim: z.string().optional(),
    yearStart: z.number().int(),
    yearEnd: z.number().int().optional(),
    cover: z.string().optional(),
    // Discriminator field — required in M2
    section: z.enum(["overview", "buying-guide", "common-faults", "modifications"]),
    // Editorial overrides (canonical source is DB trims rows)
    chassis_code: z.string().optional(),
    engine_code: z.string().optional(),
    power_hp_min: z.number().int().optional(),
    power_hp_max: z.number().int().optional(),
    overview_html: z.string().optional(),
    history_es: z.string().optional(),
    history_en: z.string().optional(),
  }),
});

// M7: services directory — extended schema with type/region + contact fields.
const services = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/services" }),
  schema: z.object({
    // legacy (kept — FE still reads `title`/`description` for meta)
    title: z.string(),
    description: z.string(),
    locale: localeField,
    city: z.string(),
    country: z.string(),
    specialties: z.array(z.string()).default([]),
    publishedAt: z.coerce.date().optional(),
    // M7 new required fields
    name: z.string().min(1),
    type: serviceTypeField,
    region: regionField,
    // M7 new optional fields
    specialty_tags: z.array(z.string()).default([]),
    phone: phoneField.optional(),
    website: z.string().url().optional(),
    geo: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
  }),
});

// T02: modelFaults collection — one file per fault, per gen, per locale
const modelFaults = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/model-faults" }),
  schema: z.object({
    make: z.string(),
    model: z.string(),
    gen: z.string(),
    locale: localeField,
    severity: severityField,
    cost_eur_min: z.number().int().min(0),
    cost_eur_max: z.number().int().min(0),
    frequency: z.string(),
    description: z.string(),
  }),
});

// T03: modelMods collection — one file per mod, per gen, per locale
const modelMods = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/model-mods" }),
  schema: z.object({
    make: z.string(),
    model: z.string(),
    gen: z.string(),
    locale: localeField,
    category: z.string(),
    legality: legalityField,
    cost_eur_min: z.number().int().min(0),
    cost_eur_max: z.number().int().min(0),
    description: z.string(),
  }),
});

export const collections = { guides, models, services, modelFaults, modelMods };
