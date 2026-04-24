import { filterPiiLines, isPiiLine, parseFichaTecnica } from "@/lib/ficha-tecnica-parser";
/**
 * tests/unit/ficha-tecnica-parser.test.ts
 *
 * Unit tests for the Ficha Tecnica OCR parser.
 * Covers the PII blacklist (legal lynchpin) + field extraction.
 */
import { describe, expect, it } from "vitest";

// ── isPiiLine ────────────────────────────────────────────────────────────────

describe("isPiiLine", () => {
  it("detects MATRICULA (without accent)", () => {
    expect(isPiiLine("B. MATRICULA: 1234ABC")).toBe(true);
  });

  it("detects MATRÍCULA (with accent)", () => {
    expect(isPiiLine("  MATRÍCULA  1234ABC  ")).toBe(true);
  });

  it("detects BASTIDOR", () => {
    expect(isPiiLine("BASTIDOR: VF7KFWJYB12345678")).toBe(true);
  });

  it("detects VIN", () => {
    expect(isPiiLine("VIN: WBA3A5C5XDF195762")).toBe(true);
  });

  it("detects TITULAR", () => {
    expect(isPiiLine("TITULAR: GARCIA LOPEZ JUAN")).toBe(true);
  });

  it("detects DNI", () => {
    expect(isPiiLine("DNI: 12345678Z")).toBe(true);
  });

  it("detects NIE", () => {
    expect(isPiiLine("NIE: X1234567Z")).toBe(true);
  });

  it("detects DOMICILIO", () => {
    expect(isPiiLine("DOMICILIO: CALLE MAYOR 12")).toBe(true);
  });

  it("detects PERMISO", () => {
    expect(isPiiLine("PERMISO DE CIRCULACION")).toBe(true);
  });

  it("detects APELLIDOS", () => {
    expect(isPiiLine("APELLIDOS: RODRIGUEZ FERNANDEZ")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isPiiLine("bastidor: abc123")).toBe(true);
    expect(isPiiLine("MatRíCulA: 1234ABC")).toBe(true);
  });

  it("does NOT flag safe technical lines", () => {
    expect(isPiiLine("MARCA: MAZDA")).toBe(false);
    expect(isPiiLine("MODELO: MX-5")).toBe(false);
    expect(isPiiLine("POTENCIA: 96 kW")).toBe(false);
    expect(isPiiLine("PRIMERA MATRICULACION: 01/06/2005")).toBe(false);
  });
});

// ── filterPiiLines ────────────────────────────────────────────────────────────

describe("filterPiiLines", () => {
  it("drops PII lines and keeps safe lines — PII filter runs FIRST", () => {
    const raw = [
      "MINISTERIO DEL INTERIOR",
      "PERMISO DE CIRCULACION",
      "TITULAR: GARCIA LOPEZ JUAN",
      "BASTIDOR: VF7KFWJYB12345678",
      "MATRÍCULA: 1234ABC",
      "MARCA: MAZDA",
      "MODELO: MX-5",
      "POTENCIA: 96 kW",
      "PRIMERA MATRICULACION: 01/06/2005",
    ].join("\n");

    const result = filterPiiLines(raw);

    // Safe lines preserved
    expect(result).toContain("MARCA: MAZDA");
    expect(result).toContain("MODELO: MX-5");
    expect(result).toContain("POTENCIA: 96 kW");
    expect(result).toContain("PRIMERA MATRICULACION: 01/06/2005");

    // PII lines eliminated — licence plate label (MATRÍCULA:) dropped,
    // but "PRIMERA MATRICULACION" (registration date) is NOT a PII field and is kept.
    const joined = result.join(" ");
    expect(joined).not.toMatch(/PERMISO/i);
    expect(joined).not.toMatch(/TITULAR/i);
    expect(joined).not.toMatch(/BASTIDOR/i);
    // The plate label line "MATRÍCULA: 1234ABC" is dropped
    expect(joined).not.toContain("1234ABC");
  });

  it("returns empty array for empty input", () => {
    expect(filterPiiLines("")).toEqual([]);
    expect(filterPiiLines("   \n  \n  ")).toEqual([]);
  });
});

// ── parseFichaTecnica ─────────────────────────────────────────────────────────

describe("parseFichaTecnica", () => {
  // Happy path — clean OCR text
  it("parses a complete clean ficha", () => {
    const raw = [
      "MINISTERIO DEL INTERIOR",
      "MARCA: MAZDA",
      "MODELO: MX-5",
      "VARIANTE: 1.8I",
      "PRIMERA MATRICULACION: 15/06/2001",
      "POTENCIA: 96 kW",
      "CILINDRADA: 1840 cc",
      "COMBUSTIBLE: GASOLINA",
      "TIPO: E9*70/156*0008*19",
    ].join("\n");

    const r = parseFichaTecnica(raw);

    expect(r.marca).toBe("MAZDA");
    expect(r.modelo).toBe("MX-5");
    expect(r.variante).toBe("1.8I");
    expect(r.ano).toBe(2001);
    expect(r.potenciaKw).toBe(96);
    expect(r.cilindrada).toBe(1840);
    expect(r.combustible).toBe("GASOLINA");
    expect(r.homologacion).toBe("E9*70/156*0008*19");
  });

  // PII lines present — output must NOT contain any blacklisted substring
  it("PII lines are filtered before extraction — output is clean", () => {
    const raw = [
      "PERMISO DE CIRCULACION",
      "TITULAR: FERNANDEZ GONZALEZ MARIA",
      "BASTIDOR: WBA3A5C5XDF195762",
      "MATRÍCULA: 1234ABC",
      "DNI: 12345678Z",
      "DOMICILIO: CALLE MAYOR 5",
      "MARCA: SEAT",
      "MODELO: LEON",
      "PRIMERA MATRICULACION: 2003",
      "POTENCIA: 110 CV",
      "CILINDRADA: 1984 cc",
      "COMBUSTIBLE: GASOLINA",
    ].join("\n");

    const r = parseFichaTecnica(raw);

    // Safe fields extracted correctly
    expect(r.marca).toBe("SEAT");
    expect(r.modelo).toBe("LEON");
    expect(r.ano).toBe(2003);
    expect(r.cilindrada).toBe(1984);
    expect(r.combustible).toBe("GASOLINA");

    // No PII data leaked into any field
    const allValues = Object.values(r)
      .filter((v): v is string | number => v !== null)
      .map((v) => String(v).toUpperCase());

    const piiPatterns = [
      "FERNANDEZ",
      "GONZALEZ",
      "MARIA",
      "WBA3A5",
      "1234ABC",
      "12345678",
      "CALLE MAYOR",
    ];
    for (const pattern of piiPatterns) {
      for (const val of allValues) {
        expect(val).not.toContain(pattern);
      }
    }
  });

  // Missing fields return null
  it("returns null for missing fields", () => {
    const raw = "MARCA: VOLKSWAGEN\nMODELO: GOLF\n";
    const r = parseFichaTecnica(raw);

    expect(r.marca).toBe("VOLKSWAGEN");
    expect(r.modelo).toBe("GOLF");
    expect(r.variante).toBeNull();
    expect(r.ano).toBeNull();
    expect(r.potenciaKw).toBeNull();
    expect(r.cilindrada).toBeNull();
    expect(r.combustible).toBeNull();
    expect(r.homologacion).toBeNull();
  });

  // Power in CV converted to kW
  it("normalises CV to kW", () => {
    const raw = "MARCA: SEAT\nMODELO: IBIZA\nPOTENCIA: 75 CV\n";
    const r = parseFichaTecnica(raw);
    // 75 CV * 0.7355 = 55.16 → rounds to 55
    expect(r.potenciaKw).toBe(55);
  });

  it("normalises HP to kW", () => {
    const raw = "MARCA: FORD\nMODELO: MUSTANG\nPOTENCIA: 450 HP\n";
    const r = parseFichaTecnica(raw);
    // 450 * 0.7457 = 335.6 → 336
    expect(r.potenciaKw).toBe(336);
  });

  it("leaves kW value unchanged", () => {
    const raw = "POTENCIA: 100 kW\n";
    const r = parseFichaTecnica(raw);
    expect(r.potenciaKw).toBe(100);
  });

  // Year as DD/MM/YYYY
  it("extracts year from DD/MM/YYYY date", () => {
    const raw = "PRIMERA MATRICULACION: 23/07/1999\n";
    const r = parseFichaTecnica(raw);
    expect(r.ano).toBe(1999);
  });

  // Year as YYYY
  it("extracts bare 4-digit year", () => {
    const raw = "ANO MATRIC: 2015\n";
    const r = parseFichaTecnica(raw);
    expect(r.ano).toBe(2015);
  });

  // OCR noise — extra whitespace and mis-capitalisation
  it("handles OCR noise (extra spaces, mixed case)", () => {
    const raw = [
      "  marca :   RENAULT  ",
      "  modelo :   MEGANe  ",
      "PRIMERA  MATRICULACION :  01 / 03 / 2008",
      "  potencia :  85  kW  ",
      "  CILINDRADA  :  1461  cc  ",
    ].join("\n");

    const r = parseFichaTecnica(raw);
    // Marca and modelo extracted despite spacing/case noise
    expect(r.marca).toBe("RENAULT");
    expect(r.cilindrada).toBe(1461);
    expect(r.potenciaKw).toBe(85);
  });

  // Diesel variants
  it("matches DIESEL and DIÉSEL variants", () => {
    const rawD = "COMBUSTIBLE: DIESEL\n";
    expect(parseFichaTecnica(rawD).combustible).toBe("DIESEL");

    const rawDE = "COMBUSTIBLE: DIÉSEL\n";
    expect(parseFichaTecnica(rawDE).combustible).toBe("DIÉSEL");
  });
});
