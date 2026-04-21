/**
 * ListingsFilterDrawer.tsx — T15
 * Mobile filter drawer island. Uses native <dialog>, focus trap, Escape closes.
 * REQ-LIST-03, REQ-A11Y-01, REQ-A11Y-02, SC-08.
 */
import { Dialog } from "@/components/ui/dialog";
import { useRef, useState } from "react";

interface FilterDrawerProps {
  action: string;
  labels: {
    open: string;
    close: string;
    heading: string;
    priceMin: string;
    priceMax: string;
    yearMin: string;
    yearMax: string;
    kmMax: string;
    sortLabel: string;
    sortLastSeen: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    apply: string;
    clear: string;
  };
  initialValues: {
    price_min?: number;
    price_max?: number;
    year_min?: number;
    year_max?: number;
    km_max?: number;
    sort?: string;
  };
  pinnedGen?: string;
}

export default function ListingsFilterDrawer({
  action,
  labels,
  initialValues,
  pinnedGen,
}: FilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function handleClose() {
    setOpen(false);
    // REQ-A11Y-02: return focus to trigger on close
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex lg:hidden items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-border)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={labels.open}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="14" y2="12" />
          <line x1="4" y1="18" x2="10" y2="18" />
        </svg>
        {labels.open}
      </button>

      <Dialog open={open} onClose={handleClose} title={labels.heading} closeLabel={labels.close}>
        <form method="get" action={action} className="flex flex-col gap-4">
          {pinnedGen && <input type="hidden" name="gen" value={pinnedGen} />}

          {/* Price range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-muted)]" htmlFor="drawer-price_min">
                {labels.priceMin}
              </label>
              <input
                id="drawer-price_min"
                name="price_min"
                type="number"
                min="0"
                step="500"
                defaultValue={initialValues.price_min ?? ""}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-muted)]" htmlFor="drawer-price_max">
                {labels.priceMax}
              </label>
              <input
                id="drawer-price_max"
                name="price_max"
                type="number"
                min="0"
                step="500"
                defaultValue={initialValues.price_max ?? ""}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
              />
            </div>
          </div>

          {/* Year range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-muted)]" htmlFor="drawer-year_min">
                {labels.yearMin}
              </label>
              <input
                id="drawer-year_min"
                name="year_min"
                type="number"
                min="1950"
                max="2030"
                defaultValue={initialValues.year_min ?? ""}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-muted)]" htmlFor="drawer-year_max">
                {labels.yearMax}
              </label>
              <input
                id="drawer-year_max"
                name="year_max"
                type="number"
                min="1950"
                max="2030"
                defaultValue={initialValues.year_max ?? ""}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
              />
            </div>
          </div>

          {/* KM max */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-muted)]" htmlFor="drawer-km_max">
              {labels.kmMax}
            </label>
            <input
              id="drawer-km_max"
              name="km_max"
              type="number"
              min="0"
              step="10000"
              defaultValue={initialValues.km_max ?? ""}
              className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
            />
          </div>

          {/* Sort */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-muted)]" htmlFor="drawer-sort">
              {labels.sortLabel}
            </label>
            <select
              id="drawer-sort"
              name="sort"
              defaultValue={initialValues.sort ?? "last_seen_at_desc"}
              className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
            >
              <option value="last_seen_at_desc">{labels.sortLastSeen}</option>
              <option value="price_asc">{labels.sortPriceAsc}</option>
              <option value="price_desc">{labels.sortPriceDesc}</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-[var(--radius)] bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
            >
              {labels.apply}
            </button>
            <a
              href={action}
              className="flex-1 rounded-[var(--radius)] border border-[var(--color-border)] py-2.5 text-center text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
            >
              {labels.clear}
            </a>
          </div>
        </form>
      </Dialog>
    </>
  );
}
