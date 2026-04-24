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
  // Engine serial number (bloc motor) — is indirectly tied to the owner
  // via the insurance records and vehicle log.
  /N\.?º\s*(?:DE\s*)?SERIE/i,
  /N[UÚ]MERO\s*(?:DE\s*)?SERIE/i,
  // Vehicle certificate number (certificate of conformity — links to owner)
  /N\.?º\s*(?:DE\s*)?CERTIFICADO/i,
  /N[UÚ]MERO\s*(?:DE\s*)?CERTIFICADO/i,
  // National ID document references — any "de identificación" label
  // (the vehicle-series "Nº de identificación" plus the owner-focused
  // "Nombre de identificación" that appears on older SEAT fichas).
  /N\.?º\s*DE\s*IDENTIFICACI[OÓ]N/i,
  /N[UÚ]MERO\s*DE\s*IDENTIFICACI[OÓ]N/i,
  /NOMBRE\s+DE\s+IDENTIFICACI[OÓ]N/i,
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

/** "Next label" lookahead — ends the capture when a Spanish Title-Case word
 *  (uppercase + lowercase) appears after whitespace. Works for inline ficha
 *  técnica layouts where multiple labels share a line: "Marca: SEAT Clase:"
 *  stops "SEAT" before "Clase"; "LEON 1.6 5V Vía..." stops at "Vía". */
const NEXT_LABEL_LOOKAHEAD = /(?=\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñí]|[\n\r]|$)/u.source;

const RE_MARCA = new RegExp(`MARCA[:\\s]+(.+?)${NEXT_LABEL_LOOKAHEAD}`, "i");
const RE_MODELO = new RegExp(`MODELO[:\\s]+(.+?)${NEXT_LABEL_LOOKAHEAD}`, "i");
/** Fallback for fichas técnicas that use "Denominación comercial" instead of "Modelo". */
const RE_DENOMINACION = new RegExp(
  `DENOMINACI[ÓO]N\\s*COMERCIAL[:\\s]+(.+?)${NEXT_LABEL_LOOKAHEAD}`,
  "i"
);
const RE_VARIANTE = /VARIANTE[:\s]+([^\n\r]+)/i;
const RE_VERSION = /VERSI[ÓO]N[:\s]+([^\n\r]+)/i;
const RE_YEAR =
  /(?:PRIMERA\s+MATRICULACI[ÓO]N|A[ÑN]O\s+MATRIC)[:\s]+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4})/i;
/** Matches the Spanish long-form date "01 de febrero de 2002" that often sits next to the
 *  certificate issue place (e.g. "Barcelona, 01 de febrero de 2002"). Captures the year. */
const RE_YEAR_SPANISH =
  /\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i;
const RE_POWER = /POTENCIA[:\s]+(\d+(?:[,\.]\d+)?)\s*(kW|CV|HP)/i;
/** Newer fichas use "Potencia fiscal/real (CV kW): 11.64/77" — two numbers separated by "/",
 *  where the second is the kW figure. Capture it directly. */
const RE_POWER_FISCAL =
  /POTENCIA[^\n]*(?:fiscal|real)[^\n]*(?:CV|kW)[^\n]*[:\s]+([\d.,]+)\s*\/\s*(\d+)/i;
const RE_DISPLACEMENT = /CILINDRADA[:\s]+(\d{3,5})\s*(cc|cm3|CM3|cm³)/i;
/** Combined "Nº Cilindros/Cilindrada cm³: 4/1598" field — capture the cc value (after the slash). */
const RE_DISPLACEMENT_COMBINED =
  /CILINDROS[^\n]*CILINDRADA[^\n]*(?:cm[³3]|cc)[^\n]*[:\s]+\d+\s*\/\s*(\d{3,5})/i;
const RE_FUEL = /COMBUSTIBLE[:\s]+(GASOLINA|DIESEL|DI[ÉE]SEL|GLP|GAS|EL[ÉE]CTRICO|H[ÍI]BRIDO)/i;
const RE_HOMOLOGATION = /(?:TIPO|HOMOLOGACI[ÓO]N)[:\s\-]+([A-Z0-9\-\/\*]+)/i;

/** Spanish month name → month number (not currently needed for extraction, but documented
 *  here so anyone extending RE_YEAR_SPANISH knows the accepted set). */
const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};
// Silence unused-const warning — kept for docs / future extension.
void SPANISH_MONTHS;

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

  // STEP 2 — Field extraction on clean lines only.
  //
  // For "Marca" we exclude lines that describe the engine ("Motor Marca:
  // VOLKSWAGEN" must not override "Marca: SEAT" for the vehicle itself).
  const vehicleLines = safeLines.filter((l) => !/MOTOR\s+MARCA/i.test(l));
  const marca = matchField(RE_MARCA, vehicleLines);

  // MODELO first; fall back to DENOMINACIÓN COMERCIAL (used in older SEAT /
  // Spanish fichas técnicas where the canonical field label is different).
  const modelo = matchField(RE_MODELO, safeLines) ?? matchField(RE_DENOMINACION, safeLines);

  // VARIANTE or VERSIÓN (pick first non-null)
  const variante = matchField(RE_VARIANTE, safeLines) ?? matchField(RE_VERSION, safeLines);

  // Year — try the labelled fields first, then fall back to Spanish
  // long-form date (e.g. "Barcelona, 01 de febrero de 2002").
  const rawYear = matchField(RE_YEAR, safeLines);
  const spanishYear = !rawYear ? matchField(RE_YEAR_SPANISH, safeLines) : null;
  const ano = rawYear ? extractYear(rawYear) : spanishYear ? extractYear(spanishYear) : null;

  // Power — combined "fiscal/real" format first (newer fichas), then the
  // simple POTENCIA: <n> <unit> form.
  let potenciaKw: number | null = null;
  for (const line of safeLines) {
    const combined = line.match(RE_POWER_FISCAL);
    if (combined) {
      const kw = Number.parseInt(combined[2], 10);
      if (!Number.isNaN(kw)) potenciaKw = kw;
      break;
    }
    const simple = line.match(RE_POWER);
    if (simple) {
      const value = Number.parseFloat(simple[1].replace(",", "."));
      if (!Number.isNaN(value)) {
        potenciaKw = normaliseToKw(value, simple[2]);
      }
      break;
    }
  }

  // Displacement — try combined "Cilindros/Cilindrada: 4/1598 cm³" first,
  // then the simple "CILINDRADA: 1598 cc" form.
  let cilindrada: number | null = null;
  for (const line of safeLines) {
    const combined = line.match(RE_DISPLACEMENT_COMBINED);
    if (combined) {
      const v = Number.parseInt(combined[1], 10);
      if (!Number.isNaN(v)) cilindrada = v;
      break;
    }
    const simple = line.match(RE_DISPLACEMENT);
    if (simple) {
      const v = Number.parseInt(simple[1], 10);
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
