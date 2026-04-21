import { cn } from "@/lib/utils";
import { useState } from "react";

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ items, defaultTab, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id ?? "");

  return (
    <div className={cn("w-full", className)}>
      <div role="tablist" className="flex border-b border-[var(--color-border)]">
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={active === item.id}
            aria-controls={`tabpanel-${item.id}`}
            id={`tab-${item.id}`}
            type="button"
            onClick={() => setActive(item.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
              active === item.id
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-fg)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`tabpanel-${item.id}`}
          aria-labelledby={`tab-${item.id}`}
          hidden={active !== item.id}
          className="pt-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

import type React from "react";
