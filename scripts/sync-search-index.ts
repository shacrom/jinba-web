#!/usr/bin/env tsx
/**
 * Build the Meilisearch document list from Astro content collections (MDX
 * frontmatter) and push it to the `jinba-content` index.
 *
 * Env (both required to actually push):
 *   MEILI_HOST        e.g. https://search.jinba.dev
 *   MEILI_ADMIN_KEY   the admin / write key
 *
 * When either is missing the script exits 0 in "dry run" mode: docs are built
 * and counted but nothing is sent. This keeps CI green without infra and makes
 * local smoke testing painless.
 *
 * Invocation:
 *   npm run search:sync
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { MeiliSearch } from "meilisearch";
import { z } from "zod";

import { SEARCH_INDEX_UID, type SearchDoc } from "../src/lib/search-types.ts";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const CONTENT_DIR = join(REPO_ROOT, "src", "content");

// ── 1. tiny frontmatter parser (strings, numbers, ISO dates, string arrays) ──

function parseFrontmatter(source: string): Record<string, unknown> {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const raw = match[1];
  const out: Record<string, unknown> = {};
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.trim().length === 0 || line.trim().startsWith("#")) continue;
    const keyMatch = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.*)$/);
    if (!keyMatch) continue;
    const [, key, rest] = keyMatch;
    const value = rest.trim();
    out[key] = coerceValue(value);
  }
  return out;
}

function coerceValue(raw: string): unknown {
  if (raw.length === 0) return "";
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/\\"/g, '"');
  }
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (inner.length === 0) return [] as string[];
    return inner
      .split(/\s*,\s*/)
      .map((part) => part.trim().replace(/^"|"$/g, ""))
      .filter((part) => part.length > 0);
  }
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return Number.parseFloat(raw);
  return raw;
}

// ── 2. collect MDX files ────────────────────────────────────────────────────

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (extname(entry) === ".mdx") {
      out.push(full);
    }
  }
  return out;
}

// ── 3. Zod validators per document type ─────────────────────────────────────

const localeSchema = z.enum(["es", "en"]);

const modelFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  locale: localeSchema,
  make: z.string(),
  model: z.string(),
  generation: z.string(),
  section: z.enum(["overview", "buying-guide", "common-faults", "modifications"]),
});

const guideFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  locale: localeSchema,
  tags: z.array(z.string()).default([]),
});

const serviceFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  locale: localeSchema,
  name: z.string(),
  type: z.enum(["workshop", "homologation", "parts", "media"]),
  region: z.string(),
  specialty_tags: z.array(z.string()).default([]),
});

// ── 4. builders ─────────────────────────────────────────────────────────────

export function buildModelDocs(files: { path: string; content: string }[]): SearchDoc[] {
  // one document per (make, model, generation, locale) — use the `overview`
  // section if present, else the first section found.
  const byKey = new Map<
    string,
    { title: string; description: string; meta: z.infer<typeof modelFrontmatterSchema> }
  >();

  for (const file of files) {
    const fm = parseFrontmatter(file.content);
    const parsed = modelFrontmatterSchema.safeParse(fm);
    if (!parsed.success) continue;
    const key = `${parsed.data.make}/${parsed.data.model}/${parsed.data.generation}/${parsed.data.locale}`;
    const current = byKey.get(key);
    if (!current || parsed.data.section === "overview") {
      byKey.set(key, {
        title: parsed.data.title,
        description: parsed.data.description,
        meta: parsed.data,
      });
    }
  }

  const docs: SearchDoc[] = [];
  for (const [, { title, description, meta }] of byKey) {
    docs.push({
      objectID: `model:${meta.make}/${meta.model}/${meta.generation}:${meta.locale}`,
      type: "model",
      locale: meta.locale,
      title,
      description,
      url: `/${meta.locale}/${meta.make}/${meta.model}/${meta.generation}/`,
      tags: [meta.make, meta.model, meta.generation],
      make: meta.make,
      model: meta.model,
      generation: meta.generation,
    });
  }
  return docs;
}

export function buildGuideDocs(files: { path: string; content: string }[]): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const file of files) {
    const fm = parseFrontmatter(file.content);
    const parsed = guideFrontmatterSchema.safeParse(fm);
    if (!parsed.success) continue;
    // slug from filename: `buyers-guide-general.es.mdx` → `buyers-guide-general`
    const base = file.path.split("/").pop() ?? "";
    const slug = base.replace(/\.(es|en)\.mdx$/, "");
    docs.push({
      objectID: `guide:${slug}:${parsed.data.locale}`,
      type: "guide",
      locale: parsed.data.locale,
      title: parsed.data.title,
      description: parsed.data.description,
      url: `/${parsed.data.locale}/guides/${slug}/`,
      tags: parsed.data.tags,
    });
  }
  return docs;
}

export function buildServiceDocs(files: { path: string; content: string }[]): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const file of files) {
    const fm = parseFrontmatter(file.content);
    const parsed = serviceFrontmatterSchema.safeParse(fm);
    if (!parsed.success) continue;
    const base = file.path.split("/").pop() ?? "";
    const slug = base.replace(/\.(es|en)\.mdx$/, "");
    docs.push({
      objectID: `service:${slug}:${parsed.data.locale}`,
      type: "service",
      locale: parsed.data.locale,
      title: parsed.data.name,
      description: parsed.data.description,
      url: `/${parsed.data.locale}/services/${slug}/`,
      tags: parsed.data.specialty_tags,
      serviceType: parsed.data.type,
      region: parsed.data.region,
    });
  }
  return docs;
}

// ── 5. main ─────────────────────────────────────────────────────────────────

async function main() {
  const host = process.env.MEILI_HOST;
  const adminKey = process.env.MEILI_ADMIN_KEY;

  const modelFiles = walk(join(CONTENT_DIR, "models")).map((path) => ({
    path,
    content: readFileSync(path, "utf8"),
  }));
  const guideFiles = walk(join(CONTENT_DIR, "guides"))
    .filter((p) => !p.includes("sample."))
    .map((path) => ({ path, content: readFileSync(path, "utf8") }));
  const serviceFiles = walk(join(CONTENT_DIR, "services")).map((path) => ({
    path,
    content: readFileSync(path, "utf8"),
  }));

  console.log(`[search:sync] reading content/models — ${modelFiles.length} source files`);
  console.log(`[search:sync] reading content/guides — ${guideFiles.length} source files`);
  console.log(`[search:sync] reading content/services — ${serviceFiles.length} source files`);

  const docs: SearchDoc[] = [
    ...buildModelDocs(modelFiles),
    ...buildGuideDocs(guideFiles),
    ...buildServiceDocs(serviceFiles),
  ];

  console.log(`[search:sync] built ${docs.length} documents`);

  if (!host || !adminKey) {
    console.log(
      "[search:sync] dry run — no MEILI_HOST / MEILI_ADMIN_KEY env vars. Nothing pushed."
    );
    process.exit(0);
  }

  const client = new MeiliSearch({ host, apiKey: adminKey });
  const index = client.index<SearchDoc>(SEARCH_INDEX_UID);

  console.log(`[search:sync] PUSH ${host}/indexes/${SEARCH_INDEX_UID}`);

  const settings = await index.updateSettings({
    searchableAttributes: ["title", "description", "tags", "make", "model", "region"],
    filterableAttributes: ["type", "locale", "serviceType", "region"],
    sortableAttributes: ["type"],
  });
  console.log(`[search:sync] settings OK (task ${settings.taskUid})`);

  const del = await index.deleteAllDocuments();
  console.log(`[search:sync] delete OK (task ${del.taskUid})`);

  const add = await index.addDocuments(docs, { primaryKey: "objectID" });
  console.log(`[search:sync] add OK (task ${add.taskUid})`);

  console.log("[search:sync] done");
}

// Only run if invoked as a script (not when imported by tests).
const invokedDirectly =
  process.argv[1] && relative(resolve(process.argv[1]), import.meta.filename ?? "") === "";

if (invokedDirectly) {
  main().catch((err) => {
    console.error("[search:sync] failed:", err);
    process.exit(1);
  });
}
