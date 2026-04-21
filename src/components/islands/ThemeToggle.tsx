import { useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeToggleProps {
  label: string;
  labelLight: string;
  labelDark: string;
}

export default function ThemeToggle({ label, labelLight, labelDark }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "dark";
    setTheme(stored);
    document.documentElement.dataset.theme = stored;
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage may be blocked in some browser contexts
    }
  };

  // Button shows the label of the theme you'd switch TO (next theme).
  const nextLabel = theme === "dark" ? labelLight : labelDark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-fg)] hover:bg-[var(--color-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] transition-colors"
    >
      {nextLabel}
    </button>
  );
}
