/**
 * src/lib/taxonomy-match.ts
 *
 * Pure fuzzy-matching helper that maps OCR-extracted make/model/year to a
 * generation in our taxonomy. Used by the FichaTecnicaUpload island.
 *
 * No imports from astro, supabase, or browser APIs — fully testable in Node.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface TaxonomyEntry {
  generation_id: number;
  make_slug: string;
  make_name: string;
  model_slug: string;
  model_name: string;
  gen_slug: string;
  gen_name: string;
  year_start: number;
  year_end: number | null;
}

export interface MatchResult {
  entry: TaxonomyEntry | null;
  score: number;
  /** Top 5 candidates sorted by score descending. */
  candidates: Array<{ entry: TaxonomyEntry; score: number }>;
}

// ── String normalisation ─────────────────────────────────────────────────────

/**
 * Normalise a string for fuzzy comparison:
 *   - lowercase
 *   - remove diacritics (NFD decompose + strip combining marks)
 *   - keep only alphanumeric chars and spaces (drop punctuation)
 *   - collapse multiple spaces
 */
export function normalise(s: string): string {
  // NFD decompose, then strip all combining/diacritic marks (Unicode category M)
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Levenshtein distance ─────────────────────────────────────────────────────

/** Classic iterative Levenshtein — O(n*m) but inputs are short strings. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Similarity score ∈ [0, 1].
 * 1 = identical, 0 = completely different.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ── Scoring ──────────────────────────────────────────────────────────────────

const WEIGHT_MAKE = 0.45;
const WEIGHT_MODEL = 0.45;
const WEIGHT_YEAR = 0.1;
const YEAR_IN_RANGE_BONUS = 1.0;
const YEAR_NEAR_BONUS = 0.5; // within 2 years of range
const YEAR_PENALTY = 0.0;

const MIN_SCORE = 0.7;
const MAX_CANDIDATES = 5;

/**
 * Score a single taxonomy entry against the extracted fields.
 * Returns a value in [0, 1].
 */
function scoreEntry(
  entry: TaxonomyEntry,
  normMarca: string | null,
  normModelo: string | null,
  ano: number | null
): number {
  // Make score
  let makeScore = 0;
  if (normMarca) {
    const entryMake = normalise(entry.make_name);
    const entryMakeSlug = normalise(entry.make_slug);
    makeScore = Math.max(similarity(normMarca, entryMake), similarity(normMarca, entryMakeSlug));
    // Partial/prefix match bonus (e.g. "mazda motor" vs "mazda")
    if (normMarca.includes(entryMakeSlug) || entryMakeSlug.includes(normMarca)) {
      makeScore = Math.max(makeScore, 0.9);
    }
  }

  // Model score
  let modelScore = 0;
  if (normModelo) {
    const entryModel = normalise(entry.model_name);
    const entryModelSlug = normalise(entry.model_slug);
    modelScore = Math.max(
      similarity(normModelo, entryModel),
      similarity(normModelo, entryModelSlug)
    );
    if (normModelo.includes(entryModelSlug) || entryModelSlug.includes(normModelo)) {
      modelScore = Math.max(modelScore, 0.9);
    }
  }

  // Year score
  let yearScore = 0;
  if (ano !== null) {
    const yearEnd = entry.year_end ?? new Date().getFullYear() + 2;
    if (ano >= entry.year_start && ano <= yearEnd) {
      yearScore = YEAR_IN_RANGE_BONUS;
    } else {
      const distStart = Math.abs(ano - entry.year_start);
      const distEnd = Math.abs(ano - yearEnd);
      const dist = Math.min(distStart, distEnd);
      yearScore = dist <= 2 ? YEAR_NEAR_BONUS : YEAR_PENALTY;
    }
  } else {
    // No year info — neutral, don't penalise
    yearScore = 0.5;
  }

  return WEIGHT_MAKE * makeScore + WEIGHT_MODEL * modelScore + WEIGHT_YEAR * yearScore;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Match OCR-extracted make/model/year against the taxonomy.
 *
 * @param extracted  Fields from parseFichaTecnica (marca, modelo, ano)
 * @param taxonomy   Full generation list from Supabase (passed from the server)
 * @returns MatchResult with best entry (null if score < 0.7) + top 5 candidates
 */
export function matchTaxonomy(
  extracted: { marca: string | null; modelo: string | null; ano: number | null },
  taxonomy: TaxonomyEntry[]
): MatchResult {
  if (taxonomy.length === 0 || (!extracted.marca && !extracted.modelo)) {
    return { entry: null, score: 0, candidates: [] };
  }

  const normMarca = extracted.marca ? normalise(extracted.marca) : null;
  const normModelo = extracted.modelo ? normalise(extracted.modelo) : null;

  const scored = taxonomy
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, normMarca, normModelo, extracted.ano),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, MAX_CANDIDATES);
  const best = top[0];

  return {
    entry: best && best.score >= MIN_SCORE ? best.entry : null,
    score: best?.score ?? 0,
    candidates: top,
  };
}
