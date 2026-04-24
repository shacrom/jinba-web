/**
 * src/lib/ficha-tecnica-parser.ts
 *
 * Pure parser for Spanish Ficha Tecnica / Permiso de Circulacion OCR text.
 * Runs entirely in the browser; never called from a server route.
 *
 * LEGAL CONTRACT (matches privacy policy at /es/privacy):
 *   1. PII blacklist runs FIRST — any line containing a blacklisted keyword
 *      is dropped before any other processing.
 *   2. No blacklisted data ever reaches the field extractor.
 *   3. Only the sanitised technical fields listed in ParsedFicha may be
 *      returned to the caller.
 */

// ── PII Blacklist ────────────────────────────────────────────────────────────

/**
 * PII detection patterns.
 *
 * Each entry is a regex tested against the line (case-insensitive).
 * Using regex allows precise word-boundary matching where needed:
 *
 * - MATRÍCULA / MATRICULA: match as a label (followed by non-alpha or end),
 *   but NOT as a substring of "MATRICULACION" (the registration date field).
 * - VIN: match as whole word (avoid false-positive on e.g. "VINO").
 * - All others: plain substring match is safe and correct.
 *
 * Keep this list in sync with the privacy policy and the design brief.
 */
const PII_PATTERNS: RegExp[] = [
  // Licence plate label — "MATRÍCULA" / "MATRICULA" as a label field,
  // NOT "MATRICULACION" (first registration date).
  /MATR[IÍ]CULA(?!C)/i,
  // Chassis / VIN — whole word to avoid false positives
  /\bBASTIDOR\b/i,
  /\bVIN\b/i,
  // National ID document references
  /N\.?º\s*DE\s*IDENTIFICACI[OÓ]N/i,
  /N[UÚ]MERO\s*DE\s*IDENTIFICACI[OÓ]N/i,
  /\bTITULAR\b/i,
  /\bAPELLIDOS\b/i,
  /\bDNI\b/i,
  /\bNIE\b/i,
  /\bNIF\b/i,
  // Address fields
  /\bDOMICILIO\b/i,
  /\bDIRECCI[OÓ]N\b/i,
  /\bCALLE\b/i,
  // Document header/footer
  /\bPERMISO\b/i,
  /\bEXPEDICI[OÓ]N\b/i,
];

/**
 * Returns true if the given line contains any PII pattern (case-insensitive).
 * This is the legal lynchpin — tested explicitly in the test suite.
 */
export function isPiiLine(line: string): boolean {
  return PII_PATTERNS.some((re) => re.test(line));
}

/**
 * Filter raw OCR text: split by newlines, drop PII lines, return surviving lines.
 * Called BEFORE any field regex is applied.
 */
export function filterPiiLines(rawText: string): string[] {
  return rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !isPiiLine(l));
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ParsedFicha {
  marca: string | null;
  modelo: string | null;
  variante: string | null;
  ano: number | null;
  /** Power normalised to kW (integer). */
  potenciaKw: number | null;
  /** Displacement in cc (integer). */
  cilindrada: number | null;
  combustible: string | null;
  homologacion: string | null;
}

// ── Field Regexes ────────────────────────────────────────────────────────────

const RE_MARCA = /MARCA[:\s]+([A-Z0-9\-ÁÉÍÓÚÑÜÀÈÌÒÙÂÊÎÔÛÄËÏÖÜ\s]+?)(?:\s*[\n\r]|$)/i;
const RE_MODELO = /MODELO[:\s]+([^\n\r]+)/i;
const RE_VARIANTE = /VARIANTE[:\s]+([^\n\r]+)/i;
const RE_VERSION = /VERSI[ÓO]N[:\s]+([^\n\r]+)/i;
const RE_YEAR =
  /(?:PRIMERA\s+MATRICULACI[ÓO]N|A[ÑN]O\s+MATRIC)[:\s]+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4})/i;
const RE_POWER = /POTENCIA[:\s]+(\d+(?:[,\.]\d+)?)\s*(kW|CV|HP)/i;
const RE_DISPLACEMENT = /CILINDRADA[:\s]+(\d{3,5})\s*(cc|cm3|CM3|cm³)/i;
const RE_FUEL = /COMBUSTIBLE[:\s]+(GASOLINA|DIESEL|DI[ÉE]SEL|GLP|GAS|EL[ÉE]CTRICO|H[ÍI]BRIDO)/i;
const RE_HOMOLOGATION = /(?:TIPO|HOMOLOGACI[ÓO]N)[:\s\-]+([A-Z0-9\-\/\*]+)/i;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract year from a date string like DD/MM/YYYY or a bare 4-digit year.
 */
function extractYear(raw: string): number | null {
  const trimmed = raw.trim();
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dateMatch = trimmed.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
  if (dateMatch) {
    const y = Number.parseInt(dateMatch[3], 10);
    return y > 1900 && y <= new Date().getFullYear() + 1 ? y : null;
  }
  // Bare 4-digit year
  const bareMatch = trimmed.match(/^(\d{4})$/);
  if (bareMatch) {
    const y = Number.parseInt(bareMatch[1], 10);
    return y > 1900 && y <= new Date().getFullYear() + 1 ? y : null;
  }
  return null;
}

/**
 * Normalise power to kW.
 * CV (caballo de vapor) ≈ 0.7355 kW.
 * HP ≈ 0.7457 kW.
 */
function normaliseToKw(value: number, unit: string): number {
  const u = unit.toUpperCase();
  if (u === "CV") return Math.round(value * 0.7355);
  if (u === "HP") return Math.round(value * 0.7457);
  return Math.round(value); // already kW
}

/** Apply a regex against a joined block of surviving lines and return capture group 1. */
function matchField(regex: RegExp, lines: string[]): string | null {
  // Try per-line first (most fields appear on a single line)
  for (const line of lines) {
    const m = line.match(regex);
    if (m?.[1]) return m[1].trim();
  }
  // Fallback: try against the full joined text (handles multi-line OCR noise)
  const full = lines.join("\n");
  const m = full.match(regex);
  return m?.[1]?.trim() ?? null;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse raw OCR text from a Spanish Ficha Tecnica.
 *
 * Pipeline:
 *   1. Filter PII lines (legal requirement — runs first).
 *   2. Apply field regexes to surviving lines only.
 *   3. Return structured object; unreadable fields are null.
 */
export function parseFichaTecnica(rawText: string): ParsedFicha {
  // STEP 1 — PII filter (MUST run before any field extraction)
  const safeLines = filterPiiLines(rawText);

  // STEP 2 — Field extraction on clean lines only
  const marca = matchField(RE_MARCA, safeLines);

  const modelo = matchField(RE_MODELO, safeLines);

  // VARIANTE or VERSIÓN (pick first non-null)
  const variante = matchField(RE_VARIANTE, safeLines) ?? matchField(RE_VERSION, safeLines);

  // Year
  const rawYear = matchField(RE_YEAR, safeLines);
  const ano = rawYear ? extractYear(rawYear) : null;

  // Power
  let potenciaKw: number | null = null;
  for (const line of safeLines) {
    const m = line.match(RE_POWER);
    if (m) {
      const value = Number.parseFloat(m[1].replace(",", "."));
      if (!Number.isNaN(value)) {
        potenciaKw = normaliseToKw(value, m[2]);
      }
      break;
    }
  }

  // Displacement
  let cilindrada: number | null = null;
  for (const line of safeLines) {
    const m = line.match(RE_DISPLACEMENT);
    if (m) {
      const v = Number.parseInt(m[1], 10);
      if (!Number.isNaN(v)) cilindrada = v;
      break;
    }
  }

  // Fuel type
  const combustible = matchField(RE_FUEL, safeLines);

  // Homologation code
  const homologacion = matchField(RE_HOMOLOGATION, safeLines);

  return {
    marca: marca ?? null,
    modelo: modelo ?? null,
    variante: variante ?? null,
    ano,
    potenciaKw,
    cilindrada,
    combustible: combustible ?? null,
    homologacion: homologacion ?? null,
  };
}
