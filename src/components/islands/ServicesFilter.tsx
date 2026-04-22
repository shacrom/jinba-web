/**
 * ServicesFilter.tsx — M7 T11
 *
 * React island hydrated with `client:idle` that lets users filter the 6
 * pre-rendered service cards on `/[lang]/services/` by type + region.
 *
 * The island mutates DOM attributes on pre-rendered cards (`[data-service-card]`)
 * rather than re-rendering React children — this keeps the SSR HTML canonical
 * for SEO and avoids layout shift. An `#services-empty-state` element is
 * toggled via `hidden` when no card matches.
 *
 * A11y: each chip is a <button> with `aria-pressed` reflecting active state.
 */
import { useEffect, useState } from "react";

export interface Option {
  value: string;
  label: string;
}

export interface ServicesFilterProps {
  typeOptions: Option[];
  regionOptions: Option[];
  labels: {
    typeAll: string;
    regionAll: string;
    filtersHeading: string;
  };
}

export default function ServicesFilter({
  typeOptions,
  regionOptions,
  labels,
}: ServicesFilterProps) {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>("[data-service-card]");
    let visibleCount = 0;
    for (const card of cards) {
      const cardType = card.dataset.serviceType ?? "";
      const cardRegion = card.dataset.serviceRegion ?? "";
      const matchesType = selectedType === "all" || cardType === selectedType;
      const matchesRegion = selectedRegion === "all" || cardRegion === selectedRegion;
      const visible = matchesType && matchesRegion;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    }

    const empty = document.getElementById("services-empty-state");
    if (empty) {
      empty.hidden = visibleCount > 0;
    }
  }, [selectedType, selectedRegion]);

  const baseChip =
    "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]";
  const activeChip = "border-[var(--color-accent)] bg-[var(--color-accent)] text-black";
  const idleChip =
    "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)] hover:text-[var(--color-fg)]";

  return (
    <div className="mb-8 space-y-3" aria-label={labels.filtersHeading}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={selectedType === "all"}
          onClick={() => setSelectedType("all")}
          className={`${baseChip} ${selectedType === "all" ? activeChip : idleChip}`}
        >
          {labels.typeAll}
        </button>
        {typeOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={selectedType === o.value}
            onClick={() => setSelectedType(o.value)}
            className={`${baseChip} ${selectedType === o.value ? activeChip : idleChip}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={selectedRegion === "all"}
          onClick={() => setSelectedRegion("all")}
          className={`${baseChip} ${selectedRegion === "all" ? activeChip : idleChip}`}
        >
          {labels.regionAll}
        </button>
        {regionOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={selectedRegion === o.value}
            onClick={() => setSelectedRegion(o.value)}
            className={`${baseChip} ${selectedRegion === o.value ? activeChip : idleChip}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
