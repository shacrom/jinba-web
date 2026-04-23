import {
  type SearchDocType,
  type SearchHit,
  isSearchConfigured,
  searchContent,
} from "@/lib/search";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Locale = "es" | "en";

interface SearchBoxProps {
  locale: Locale;
  labels: {
    inputLabel: string;
    placeholder: string;
    clearLabel: string;
    resultsHeading: string;
    empty: string;
    hint: string;
    unavailable: string;
    groupModels: string;
    groupGuides: string;
    groupServices: string;
    badgeModel: string;
    badgeGuide: string;
    badgeService: string;
  };
}

const DEBOUNCE_MS = 250;

export default function SearchBox({ locale, labels }: SearchBoxProps) {
  const available = isSearchConfigured();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // seed from ?q= on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const seed = url.searchParams.get("q") ?? "";
    if (seed.length > 0) setQuery(seed);
  }, []);

  const runSearch = useCallback(
    async (q: string) => {
      if (!available) return;
      if (q.trim().length === 0) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const result = await searchContent(q, { locale, limit: 20 });
        setHits(result);
      } finally {
        setLoading(false);
      }
    },
    [available, locale]
  );

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runSearch(query);
      // mirror to URL
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (query.trim().length > 0) url.searchParams.set("q", query);
        else url.searchParams.delete("q");
        window.history.replaceState({}, "", url.toString());
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, runSearch]);

  const grouped = useMemo(() => {
    const groups: Record<SearchDocType, SearchHit[]> = {
      model: [],
      guide: [],
      service: [],
    };
    for (const hit of hits) groups[hit.type].push(hit);
    return groups;
  }, [hits]);

  if (!available) {
    return (
      <output className="block rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
        {labels.unavailable}
      </output>
    );
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--color-fg)]">
          {labels.inputLabel}
        </span>
        <span className="relative block">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder={labels.placeholder}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 pr-12 text-base text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-2 focus:outline-[var(--color-ring)]"
            autoComplete="off"
            aria-describedby="search-results"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={labels.clearLabel}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-fg)] focus:outline-2 focus:outline-[var(--color-ring)]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </span>
      </label>

      <section
        id="search-results"
        aria-label={labels.resultsHeading}
        aria-live="polite"
        aria-busy={loading}
        className="space-y-6"
      >
        {query.trim().length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">{labels.hint}</p>
        ) : hits.length === 0 && !loading ? (
          <p className="text-sm text-[var(--color-muted)]">{labels.empty}</p>
        ) : (
          <>
            {grouped.model.length > 0 && (
              <Group heading={labels.groupModels} badge={labels.badgeModel} hits={grouped.model} />
            )}
            {grouped.guide.length > 0 && (
              <Group heading={labels.groupGuides} badge={labels.badgeGuide} hits={grouped.guide} />
            )}
            {grouped.service.length > 0 && (
              <Group
                heading={labels.groupServices}
                badge={labels.badgeService}
                hits={grouped.service}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Group({
  heading,
  badge,
  hits,
}: {
  heading: string;
  badge: string;
  hits: SearchHit[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {heading}
      </h2>
      <ul className="space-y-2">
        {hits.map((hit) => (
          <li key={hit.objectID}>
            <a
              href={hit.url}
              className="group flex items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)]"
            >
              <span className="mt-1 inline-block rounded bg-[var(--color-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)] group-hover:text-[var(--color-accent)]">
                {badge}
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-[var(--color-fg)] group-hover:text-[var(--color-accent)]">
                  {hit.title}
                </span>
                <span className="mt-1 block text-sm text-[var(--color-muted)] line-clamp-1">
                  {hit.description}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
