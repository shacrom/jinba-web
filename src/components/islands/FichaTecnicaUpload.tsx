import { parseFichaTecnica } from "@/lib/ficha-tecnica-parser";
import type { ParsedFicha } from "@/lib/ficha-tecnica-parser";
import { matchTaxonomy } from "@/lib/taxonomy-match";
import type { TaxonomyEntry } from "@/lib/taxonomy-match";
/**
 * src/components/islands/FichaTecnicaUpload.tsx
 *
 * React island — mounted as client:only="react" on /[lang]/account/garage/add.
 *
 * PRIVACY CONTRACT:
 *   - Tesseract.js is loaded lazily (dynamic import) — not in the main bundle.
 *   - OCR runs entirely in the browser; the image never leaves the device.
 *   - The PII blacklist (filterPiiLines) is applied before any regex.
 *   - Only sanitised technical fields from ParsedFicha reach the review UI.
 *   - On confirm, a native HTML form POST to the existing /[lang]/account/garage/add
 *     endpoint is submitted — no new API routes, no image upload.
 */
import type React from "react";
import { useRef, useState } from "react";

// ── Props ────────────────────────────────────────────────────────────────────

export interface FichaTecnicaUploadProps {
  locale: "es" | "en";
  taxonomy: TaxonomyEntry[];
  addFormAction: string;
  labels: Record<string, string>;
}

// ── State machine ────────────────────────────────────────────────────────────

type Phase = "idle" | "processing" | "review" | "pii_warning" | "no_match" | "error";

interface ReviewState {
  parsed: ParsedFicha;
  generationId: number | null;
  candidateLabel: string;
}

// ── CSS helpers (matches existing Jinba design tokens) ────────────────────────

const inputCls =
  "w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";

const btnPrimaryCls =
  "w-full rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-fg)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-50";

const btnSeconddaryCls =
  "w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--color-fg)] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildCandidateLabel(entry: TaxonomyEntry): string {
  const years = entry.year_end ? `${entry.year_start}–${entry.year_end}` : `${entry.year_start}–`;
  return `${entry.make_name} ${entry.model_name} ${entry.gen_name} (${years})`;
}

function formatPower(kw: number | null): string {
  if (kw === null) return "";
  return `${kw} kW`;
}

function formatCilindrada(cc: number | null): string {
  if (cc === null) return "";
  return `${cc} cc`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FichaTecnicaUpload({
  locale: _locale,
  taxonomy,
  addFormAction,
  labels,
}: FichaTecnicaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [review, setReview] = useState<ReviewState | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Editable review fields
  const [marcaEdit, setMarcaEdit] = useState("");
  const [modeloEdit, setModeloEdit] = useState("");
  const [anoEdit, setAnoEdit] = useState("");
  const [potenciaEdit, setPotenciaEdit] = useState("");
  const [cilindradaEdit, setCilindradaEdit] = useState("");
  const [combustibleEdit, setCombustibleEdit] = useState("");
  const [kmEdit, setKmEdit] = useState("");
  const [genIdEdit, setGenIdEdit] = useState<number | null>(null);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setPhase("processing");
    setErrorMsg("");

    try {
      // Dynamically import tesseract.js — kept out of the main bundle
      const { createWorker } = await import("tesseract.js");

      const worker = await createWorker(["spa", "eng"], 1, {
        // Silence tesseract.js logs in production
        logger: () => {},
        errorHandler: () => {},
      });

      let imageSource: File | string = file;

      // PDF: extract page 1 as a data URL via canvas
      if (file.type === "application/pdf") {
        try {
          imageSource = await extractPdfPage(file);
        } catch {
          // Fall back to letting tesseract attempt it directly
          imageSource = file;
        }
      }

      const {
        data: { text },
      } = await worker.recognize(imageSource);
      await worker.terminate();

      if (!text || text.trim().length === 0) {
        setPhase("error");
        setErrorMsg(labels["garage.ocr.error_generic"] ?? "OCR failed.");
        return;
      }

      // Check if the raw text contains PII keywords — show a gentle warning
      // but still filter and proceed
      const hasPiiSignal = checkRawPii(text);

      const parsed = parseFichaTecnica(text);
      const matchResult = matchTaxonomy(
        { marca: parsed.marca, modelo: parsed.modelo, ano: parsed.ano },
        taxonomy
      );

      // Populate editable fields from parse result
      setMarcaEdit(parsed.marca ?? "");
      setModeloEdit(parsed.modelo ?? "");
      setAnoEdit(parsed.ano ? String(parsed.ano) : "");
      setPotenciaEdit(formatPower(parsed.potenciaKw));
      setCilindradaEdit(formatCilindrada(parsed.cilindrada));
      setCombustibleEdit(parsed.combustible ?? "");
      setKmEdit("");

      const bestEntry = matchResult.entry;
      setGenIdEdit(bestEntry?.generation_id ?? null);

      const candidateLabel = bestEntry ? buildCandidateLabel(bestEntry) : "";

      setReview({
        parsed,
        generationId: bestEntry?.generation_id ?? null,
        candidateLabel,
      });

      if (hasPiiSignal) {
        setPhase("pii_warning");
      } else if (!bestEntry) {
        setPhase("no_match");
      } else {
        setPhase("review");
      }
    } catch (err) {
      console.error("[FichaTecnicaUpload] OCR error:", err);
      setPhase("error");
      setErrorMsg(labels["garage.ocr.error_generic"] ?? "OCR failed.");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  // ── Confirm submit ─────────────────────────────────────────────────────────

  const handleConfirm = () => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = addFormAction;

    const fields: Record<string, string> = {
      generation_id: genIdEdit !== null ? String(genIdEdit) : "",
      year: anoEdit,
      km: kmEdit,
      // Remaining fields (purchase date, price, notes) left blank for manual entry
    };

    for (const [name, value] of Object.entries(fields)) {
      if (!value) continue;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleReset = () => {
    setPhase("idle");
    setReview(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "idle") {
    return (
      <div className="space-y-3">
        <label htmlFor="ficha-file-input" className="block text-sm font-medium">
          {labels["garage.ocr.upload_label"]}
        </label>
        <p className="text-xs text-[var(--color-muted)]">{labels["garage.ocr.upload_hint"]}</p>
        <input
          id="ficha-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={onFileChange}
          className={`${inputCls} cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[var(--color-accent-fg)]`}
        />
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm">{labels["garage.ocr.processing"]}</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="space-y-3">
        <div
          role="alert"
          className="rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {errorMsg || labels["garage.ocr.error_generic"]}
        </div>
        <button type="button" onClick={handleReset} className={btnSeconddaryCls}>
          {labels["garage.ocr.upload_label"]}
        </button>
      </div>
    );
  }

  // PII warning — still show review after dismissal
  const piiWarning =
    phase === "pii_warning" ? (
      <div
        role="alert"
        className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-400"
      >
        {labels["garage.ocr.error_consent_pii"]}
      </div>
    ) : null;

  if (phase === "no_match" || phase === "pii_warning" || phase === "review") {
    const isNoMatch = phase === "no_match";

    return (
      <div className="space-y-5">
        {piiWarning}

        {isNoMatch && (
          <div className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-muted)]">
            {labels["garage.ocr.no_match"]}
          </div>
        )}

        <h2 className="text-base font-semibold">{labels["garage.ocr.review_title"]}</h2>

        <div className="space-y-4">
          {/* Generation picker (from taxonomy candidates) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ocr-gen" className="text-sm font-medium">
              {labels["garage.form.generation"]}
            </label>
            <select
              id="ocr-gen"
              value={genIdEdit ?? ""}
              onChange={(e) => setGenIdEdit(e.target.value ? Number(e.target.value) : null)}
              className={inputCls}
            >
              <option value="">—</option>
              {taxonomy.map((e) => (
                <option key={e.generation_id} value={e.generation_id}>
                  {buildCandidateLabel(e)}
                </option>
              ))}
            </select>
            {review?.candidateLabel && (
              <p className="text-xs text-[var(--color-muted)]">OCR: {review.candidateLabel}</p>
            )}
          </div>

          {/* Year */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ocr-year" className="text-sm font-medium">
              {labels["garage.ocr.field.ano"]}
            </label>
            <input
              id="ocr-year"
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              value={anoEdit}
              onChange={(e) => setAnoEdit(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* KM — not on a ficha, user must fill */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ocr-km" className="text-sm font-medium">
              {labels["garage.ocr.km_label"]}
            </label>
            <input
              id="ocr-km"
              type="number"
              min={0}
              value={kmEdit}
              onChange={(e) => setKmEdit(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Read-only extracted fields for user verification */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-muted)]">
                {labels["garage.ocr.field.marca"]}
              </span>
              <input
                type="text"
                value={marcaEdit}
                onChange={(e) => setMarcaEdit(e.target.value)}
                className={inputCls}
                aria-label={labels["garage.ocr.field.marca"]}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-muted)]">
                {labels["garage.ocr.field.modelo"]}
              </span>
              <input
                type="text"
                value={modeloEdit}
                onChange={(e) => setModeloEdit(e.target.value)}
                className={inputCls}
                aria-label={labels["garage.ocr.field.modelo"]}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-muted)]">
                {labels["garage.ocr.field.potencia"]}
              </span>
              <input
                type="text"
                value={potenciaEdit}
                onChange={(e) => setPotenciaEdit(e.target.value)}
                className={inputCls}
                aria-label={labels["garage.ocr.field.potencia"]}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-muted)]">
                {labels["garage.ocr.field.cilindrada"]}
              </span>
              <input
                type="text"
                value={cilindradaEdit}
                onChange={(e) => setCilindradaEdit(e.target.value)}
                className={inputCls}
                aria-label={labels["garage.ocr.field.cilindrada"]}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <span className="text-xs text-[var(--color-muted)]">
                {labels["garage.ocr.field.combustible"]}
              </span>
              <input
                type="text"
                value={combustibleEdit}
                onChange={(e) => setCombustibleEdit(e.target.value)}
                className={inputCls}
                aria-label={labels["garage.ocr.field.combustible"]}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!genIdEdit || !anoEdit}
          className={btnPrimaryCls}
        >
          {labels["garage.ocr.confirm"]}
        </button>

        <button type="button" onClick={handleReset} className={btnSeconddaryCls}>
          {labels["garage.ocr.upload_label"]}
        </button>

        <p className="text-xs text-[var(--color-muted)]">{labels["garage.ocr.privacy_note"]}</p>
      </div>
    );
  }

  return null;
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Check raw OCR text for PII keyword signals (before filtering).
 * Used to decide whether to show the pii_warning phase.
 * This does NOT mean we expose PII — the filter still strips those lines.
 */
const RAW_PII_SIGNAL_KWS = [
  "MATRÍCULA",
  "MATRICULA",
  "BASTIDOR",
  "VIN",
  "TITULAR",
  "DNI",
  "NIE",
  "NIF",
];

function checkRawPii(rawText: string): boolean {
  const upper = rawText.toUpperCase();
  return RAW_PII_SIGNAL_KWS.some((kw) => upper.includes(kw));
}

/**
 * Extract the first page of a PDF as a PNG data URL using the browser Canvas API.
 * Falls back to a rejected promise if PDF.js or canvas is not available.
 */
async function extractPdfPage(file: File): Promise<string> {
  // Dynamically import pdfjs-dist only if needed (not shipped otherwise)
  // For MVP we just convert the PDF blob to an object URL and pass it to
  // tesseract — tesseract.js v5+ can handle PDF via its own internal path.
  // The canvas route requires pdfjs which we haven't bundled; skip it.
  throw new Error("PDF canvas extraction not available in MVP; use image input.");
}
