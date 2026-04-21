import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Accessible label for the close button. Pass an i18n string (e.g. t(locale)("listings.filter.closeDrawer")). */
  closeLabel?: string;
}

export function Dialog({ open, onClose, title, children, className, closeLabel }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-[var(--color-card-fg)] shadow-[var(--shadow-card)] backdrop:bg-black/50 open:flex open:flex-col open:gap-4 max-w-lg w-full",
        className
      )}
    >
      {title && <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>}
      {children}
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel ?? "Close"}
        className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1 text-[var(--color-muted)] hover:text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        ×
      </button>
    </dialog>
  );
}

import type React from "react";
