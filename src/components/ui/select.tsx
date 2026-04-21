import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-sm text-[var(--color-fg)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

export function SelectItem({ className, ...props }: SelectItemProps) {
  return <option className={cn("bg-[var(--color-card)]", className)} {...props} />;
}

// React import for JSX
import type React from "react";
