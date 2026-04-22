import type {
  CalcTaxonomy,
  Condition,
  EstimateAvailable,
  PriceEstimateResponse,
} from "@/lib/price-estimate-types";
/**
 * CalculatorForm.tsx — M5
 * React island powering `/[lang]/calculator/`.
 *
 * - Cascading selects (make → model → gen → trim) populated from the
 *   taxonomy prop (server-rendered into the page, no runtime DB call).
 * - Year select bounded by the chosen generation's year_start..year_end.
 * - Client-side presence validation, then POST to `/api/price-estimate`.
 * - Prefills make/model/gen from URL query params on mount.
 * - Result region uses role="status" + aria-live + moves focus to heading.
 *
 * REQ-CALC-FORM-01/02/03/04, REQ-CALC-A11Y-01.
 */
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface ConditionLabels {
  excellent: string;
  good: string;
  fair: string;
  rough: string;
}

export interface CalculatorFormLabels {
  make: string;
  model: string;
  gen: string;
  trim: string;
  year: string;
  km: string;
  condition: string;
  submit: string;
  loading: string;
  errorRequired: string;
  errorGeneric: string;
  trimAny: string;
  resultHeading: string;
  estimate: string;
  range: string;
  basis: string;
  unavailable: string;
  howItWorks: string;
  conditionOpts: ConditionLabels;
}

export interface CalculatorFormProps {
  taxonomy: CalcTaxonomy;
  locale: "es" | "en";
  labels: CalculatorFormLabels;
}

type FormState = "idle" | "loading" | "ok" | "error";

const CONDITIONS: Condition[] = ["excellent", "good", "fair", "rough"];

export default function CalculatorForm({ taxonomy, locale, labels }: CalculatorFormProps) {
  const nameOf = <T extends { name_es: string; name_en: string }>(x: T): string =>
    locale === "es" ? x.name_es : x.name_en;

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [gen, setGen] = useState("");
  const [trim, setTrim] = useState("");
  const [year, setYear] = useState("");
  const [km, setKm] = useState("");
  const [condition, setCondition] = useState<Condition>("good");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<PriceEstimateResponse | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // Prefill from URL query params (?make=...&model=...&gen=...)
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const mk = q.get("make") ?? "";
      const mo = q.get("model") ?? "";
      const ge = q.get("gen") ?? "";
      const matchedMake = taxonomy.find((t) => t.slug === mk);
      if (!matchedMake) return;
      setMake(mk);
      const matchedModel = matchedMake.models.find((m) => m.slug === mo);
      if (!matchedModel) return;
      setModel(mo);
      const matchedGen = matchedModel.gens.find((g) => g.slug === ge);
      if (!matchedGen) return;
      setGen(ge);
    } catch {
      // Ignore — URL parse errors simply mean no prefill
    }
  }, [taxonomy]);

  const models = useMemo(
    () => taxonomy.find((t) => t.slug === make)?.models ?? [],
    [taxonomy, make]
  );
  const gens = useMemo(() => models.find((m) => m.slug === model)?.gens ?? [], [models, model]);
  const selectedGen = useMemo(() => gens.find((g) => g.slug === gen), [gens, gen]);
  const trims = selectedGen?.trims ?? [];

  const yearOptions = useMemo<number[]>(() => {
    if (!selectedGen) return [];
    const end = selectedGen.year_end ?? new Date().getUTCFullYear();
    const out: number[] = [];
    for (let y = selectedGen.year_start; y <= end; y++) out.push(y);
    return out;
  }, [selectedGen]);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const onMakeChange = (value: string) => {
    setMake(value);
    setModel("");
    setGen("");
    setTrim("");
    setYear("");
  };
  const onModelChange = (value: string) => {
    setModel(value);
    setGen("");
    setTrim("");
    setYear("");
  };
  const onGenChange = (value: string) => {
    setGen(value);
    setTrim("");
    setYear("");
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    if (!make || !model || !gen || !year || !km) {
      setErrorMsg(labels.errorRequired);
      setState("error");
      return;
    }
    setState("loading");
    setResult(null);
    try {
      const res = await fetch("/api/price-estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          make,
          model,
          gen,
          trim: trim || undefined,
          year: Number(year),
          km: Number(km),
          condition,
          currency: "EUR",
        }),
      });
      if (!res.ok) {
        setState("error");
        setErrorMsg(labels.errorGeneric);
        return;
      }
      const data = (await res.json()) as PriceEstimateResponse;
      setResult(data);
      setState("ok");
      queueMicrotask(() => {
        resultHeadingRef.current?.focus();
      });
    } catch {
      setState("error");
      setErrorMsg(labels.errorGeneric);
    }
  };

  const renderResult = () => {
    if (result === null) return null;
    if (result.available === false) {
      return <p className="text-sm text-[var(--color-muted)]">{labels.unavailable}</p>;
    }
    return renderAvailable(result);
  };

  const renderAvailable = (r: EstimateAvailable) => (
    <>
      <h2 tabIndex={-1} ref={resultHeadingRef} className="text-lg font-semibold outline-none">
        {labels.resultHeading}
      </h2>
      <p className="mt-2 text-3xl font-semibold">{fmt.format(r.estimate_eur)}</p>
      <p className="text-sm text-[var(--color-muted)]">
        {labels.range}: {fmt.format(r.range.low)} – {fmt.format(r.range.high)}
      </p>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {labels.basis
          .replace("{count}", String(r.basis.count))
          .replace("{days}", String(r.basis.window_days))
          .replace("{median}", fmt.format(r.basis.median))}
      </p>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]">
          {labels.howItWorks}
        </summary>
        <p className="mt-2 text-xs text-[var(--color-muted)]">{labels.howItWorks}</p>
      </details>
    </>
  );

  const selectClass =
    "mt-1 w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-50";

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto grid max-w-xl gap-4"
      aria-describedby="calc-result"
      noValidate
    >
      {/* Make */}
      <div>
        <label htmlFor="c-make" className="block text-sm font-medium">
          {labels.make}
        </label>
        <select
          id="c-make"
          value={make}
          required
          onChange={(e) => onMakeChange(e.target.value)}
          className={selectClass}
        >
          <option value="">—</option>
          {taxonomy.map((m) => (
            <option key={m.slug} value={m.slug}>
              {nameOf(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div>
        <label htmlFor="c-model" className="block text-sm font-medium">
          {labels.model}
        </label>
        <select
          id="c-model"
          value={model}
          required
          disabled={!make}
          onChange={(e) => onModelChange(e.target.value)}
          className={selectClass}
        >
          <option value="">—</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>
              {nameOf(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Gen */}
      <div>
        <label htmlFor="c-gen" className="block text-sm font-medium">
          {labels.gen}
        </label>
        <select
          id="c-gen"
          value={gen}
          required
          disabled={!model}
          onChange={(e) => onGenChange(e.target.value)}
          className={selectClass}
        >
          <option value="">—</option>
          {gens.map((g) => (
            <option key={g.slug} value={g.slug}>
              {nameOf(g)} ({g.year_start}
              {g.year_end ? `–${g.year_end}` : "–"})
            </option>
          ))}
        </select>
      </div>

      {/* Trim */}
      <div>
        <label htmlFor="c-trim" className="block text-sm font-medium">
          {labels.trim}
        </label>
        <select
          id="c-trim"
          value={trim}
          disabled={!gen || trims.length === 0}
          onChange={(e) => setTrim(e.target.value)}
          className={selectClass}
        >
          <option value="">{labels.trimAny}</option>
          {trims.map((t) => (
            <option key={t.slug} value={t.slug}>
              {nameOf(t)}
            </option>
          ))}
        </select>
      </div>

      {/* Year */}
      <div>
        <label htmlFor="c-year" className="block text-sm font-medium">
          {labels.year}
        </label>
        <select
          id="c-year"
          value={year}
          required
          disabled={!selectedGen}
          onChange={(e) => setYear(e.target.value)}
          className={selectClass}
        >
          <option value="">—</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Km */}
      <div>
        <label htmlFor="c-km" className="block text-sm font-medium">
          {labels.km}
        </label>
        <input
          id="c-km"
          type="number"
          inputMode="numeric"
          min={0}
          max={999_999}
          step={1000}
          value={km}
          required
          onChange={(e) => setKm(e.target.value)}
          className={selectClass}
        />
      </div>

      {/* Condition */}
      <div>
        <label htmlFor="c-cond" className="block text-sm font-medium">
          {labels.condition}
        </label>
        <select
          id="c-cond"
          value={condition}
          onChange={(e) => setCondition(e.target.value as Condition)}
          className={selectClass}
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {labels.conditionOpts[c]}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={state === "loading"}
        className="mt-2 rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hot)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-50"
      >
        {state === "loading" ? labels.loading : labels.submit}
      </button>

      {/* Inline validation / network error */}
      {errorMsg && (
        <p role="alert" className="text-sm text-[var(--color-accent-hot)]">
          {errorMsg}
        </p>
      )}

      {/* Result region — always rendered so aria-describedby resolves before fetch.
          <output> has implicit role="status" + is the semantic match for form results. */}
      <output
        id="calc-result"
        aria-live="polite"
        aria-busy={state === "loading"}
        className="mt-4 block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
      >
        {renderResult()}
      </output>
    </form>
  );
}
