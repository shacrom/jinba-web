/**
 * TocSidebarMobile.tsx — T21
 * React island: mobile drawer for table of contents.
 * REQ-TOC-02, REQ-TOC-03, REQ-TOC-04, REQ-A11Y-02, REQ-A11Y-03.
 * Uses native <dialog> for focus trapping + Escape key dismissal.
 */
import { useEffect, useRef, useState } from "react";

interface Section {
  id: string;
  title: string;
}

interface Props {
  sections: Section[];
  labels: { open: string; close: string };
}

export default function TocSidebarMobile({ sections, labels }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Open/close dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Return focus to trigger on close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  // IntersectionObserver for active section highlighting (progressive enhancement)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observers: IntersectionObserver[] = [];
    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(section.id);
        },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => {
      for (const o of observers) o.disconnect();
    };
  }, [sections]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="mb-4 flex w-full items-center justify-between rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-medium text-[var(--color-fg)] hover:bg-[var(--color-border)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>{labels.open}</span>
        <span aria-hidden="true" className="text-[var(--color-muted)]">
          ☰
        </span>
      </button>

      {/* Native <dialog> provides focus trapping + Escape key for free */}
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="toc-drawer-title"
        className="m-0 ml-auto h-full w-4/5 max-w-xs rounded-l-[var(--radius-lg)] border-0 border-l border-[var(--color-border)] bg-[var(--color-card)] p-0 backdrop:bg-black/50"
        onClick={(e) => {
          // Close on backdrop click (mouse)
          if (e.target === dialogRef.current) setIsOpen(false);
        }}
        onKeyDown={(e) => {
          // Close on backdrop Enter/Space (keyboard a11y); Escape is handled natively by <dialog>
          if ((e.key === "Enter" || e.key === " ") && e.target === dialogRef.current) {
            setIsOpen(false);
          }
        }}
      >
        <div className="flex h-full flex-col p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="toc-drawer-title"
              className="text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]"
            >
              {labels.open}
            </h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={labels.close}
              className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-border)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
            >
              ✕
            </button>
          </div>

          <nav aria-label={labels.open}>
            <ul className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={activeId === s.id ? "true" : undefined}
                    onClick={() => setIsOpen(false)}
                    className={[
                      "block rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]",
                      activeId === s.id
                        ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-medium"
                        : "text-[var(--color-fg)] hover:bg-[var(--color-border)]",
                    ].join(" ")}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
