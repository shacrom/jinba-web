/**
 * reading-time.ts — M6 editorial guides utilities.
 *
 * computeReadingTime(body, override?) — returns minutes for a prose body.
 *   Formula: override ?? max(1, ceil(body.length / 1200)).
 *   Minimum is always 1 minute so short teasers still render a badge.
 *
 * slugify(text) — ASCII-lower slugifier that mirrors `rehype-slug` output for
 *   English + Spanish titles (strips diacritics, collapses non-word chars).
 *
 * extractHeadings(body) — regex scan for top-level `## ` markdown headings in
 *   an MDX body. Returns [{ id, title }] for the TOC sidebar; safe to call
 *   with empty/undefined bodies.
 */

/** Minimum reading time in minutes (never below 1). */
const MIN_MINUTES = 1;
/** Characters per minute heuristic — aligns with M6 brief. */
const CHARS_PER_MIN = 1200;

export function computeReadingTime(body: string | undefined, override?: number): number {
  if (typeof override === "number" && override > 0) return override;
  const chars = body?.length ?? 0;
  return Math.max(MIN_MINUTES, Math.ceil(chars / CHARS_PER_MIN));
}

// Unicode range U+0300–U+036F covers the combining diacritical marks produced
// by NFD decomposition. Use `\p{...}` with the `u` flag (works on all current
// Node targets) so we don't have to paste combining characters in source
// (biome flags that as a misleading character class).
const DIACRITIC_RE = /\p{Mn}/gu;
const NON_WORD_RE = /[^a-z0-9]+/g;
const TRIM_DASH_RE = /^-+|-+$/g;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITIC_RE, "")
    .replace(NON_WORD_RE, "-")
    .replace(TRIM_DASH_RE, "");
}

/**
 * Derives the canonical guide slug from a collection entry.
 *
 * Astro 6's `glob` loader runs filenames through `github-slugger`, which
 * STRIPS dots. So `sample.es.mdx` becomes `samplees` and
 * `nissan-240z-history.en.mdx` becomes `nissan-240z-historyen`.
 *
 * Since every guide's frontmatter carries its locale, we strip that suffix
 * (and any dangling dash left by the segmentation) to get the real slug.
 */
export function guideSlug(id: string, locale: "es" | "en"): string {
  const suffix = locale;
  let out = id;
  if (out.endsWith(suffix)) out = out.slice(0, -suffix.length);
  // Defensive: strip a trailing dash if the filename was `foo-es.mdx` style.
  out = out.replace(/-$/, "");
  return out;
}

export interface Heading {
  id: string;
  title: string;
}

const H2_RE = /^##\s+(.+?)\s*$/gm;
const MD_MARK_RE = /[*_`]/g;

/**
 * Extracts `## ` (h2) headings from an MDX body, ignoring h1/h3+ and any
 * lines inside fenced code blocks at the top-level parse (good enough for
 * the editorial content we ship here — no heredocs in headings).
 */
export function extractHeadings(body: string | undefined): Heading[] {
  if (!body) return [];
  const out: Heading[] = [];
  for (const m of body.matchAll(H2_RE)) {
    const title = m[1].replace(MD_MARK_RE, "").trim();
    if (!title) continue;
    out.push({ id: slugify(title), title });
  }
  return out;
}
