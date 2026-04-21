import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const localeField = z.enum(["es", "en"]);
const severityField = z.enum(["low", "med", "high"]);
const legalityField = z.enum(["legal", "homologable", "illegal"]);

const guides = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/guides" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: localeField,
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    cover: z.string().optional(),
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

const services = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/services" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: localeField,
    city: z.string(),
    country: z.string(),
    specialties: z.array(z.string()).default([]),
    website: z.string().url().optional(),
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
