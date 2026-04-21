import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const localeField = z.enum(["es", "en"]);

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

export const collections = { guides, models, services };
