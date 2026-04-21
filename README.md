# jinba-web

Bilingual (ES/EN) public content hub for Jinba — automotive marketplace with editorial guides, model database, and workshop directory.

**Stack**: Astro 6.1 · React 19 islands · Tailwind 4 · Supabase (server-only) · Vercel hybrid SSR

---

## Prerequisites

- Node >= 24.0.0
- npm >= 10

---

## Onboarding

```bash
git clone https://github.com/shacrom/jinba-web
cd jinba-web

# Copy env file (REQUIRED — rename from env.example to .env)
cp env.example .env
# Fill in the values (see Environment Variables section below)

npm install
npm run dev
```

> Target: a new developer running `npm run dev` in under 5 minutes.

**Note on dotfiles**: The env template ships as `env.example` (not `.env.example`) to avoid sandbox restrictions. Rename to `.env` before use.

---

## Environment Variables

All variables are documented in `env.example`. Summary:

| Variable | Required | Description |
|---|---|---|
| `PUBLIC_SITE_URL` | Yes | Canonical site URL (e.g. `https://jinba.app`) |
| `PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `PUBLIC_PLAUSIBLE_DOMAIN` | No | Plausible Analytics domain (omit to disable) |
| `PUBLIC_MEILI_URL` | No | Meilisearch URL (omit to disable search) |
| `PUBLIC_MEILI_PUBLIC_KEY` | No | Meilisearch search-only key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Admin key — server-side only, NEVER expose |
| `JINBA_DB_PATH` | No | Path to jinba-db types file for sync |

---

## i18n — Adding or Editing Strings

1. Add the new key to `src/i18n/es.ts` (Spanish, master dictionary).
2. Add the same key with the English value to `src/i18n/en.ts`.
3. Run `npm run i18n:check` — it will fail if keys are out of sync.
4. CI enforces parity on every push.

```ts
// src/i18n/es.ts
export const es = DictSchema.parse({
  "my.new.key": "Valor en español",
  // ...
});

// src/i18n/en.ts
export const en: Dict = DictSchema.parse({
  "my.new.key": "English value",
  // ...
});
```

In your page/component:
```astro
---
import { t } from "@/i18n/en";
const tr = t("es"); // or "en"
---
<p>{tr("my.new.key")}</p>
```

---

## Design Tokens

All tokens live in `src/styles/global.css` inside the `@theme {}` block. Reference catalog with descriptions in `src/styles/tokens.css`.

**Usage in components:**
```css
/* CSS custom property */
background: var(--color-accent);

/* Tailwind arbitrary value */
className="bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
```

Key tokens:
- `--color-bg` — page background (deep charcoal in dark mode)
- `--color-accent` — warm amber, used for CTAs
- `--color-accent-hot` — brake-light red, used for hover/alerts
- `--font-sans` — Inter Variable (self-hosted)
- `--radius` — default border radius (0.5rem)

---

## Adding a Page

1. Create `src/pages/{locale}/my-page.astro`
2. Import and wrap with `BaseLayout`
3. Use `t()` for all user-facing strings (no hard-coded text)

```astro
---
import BaseLayout from "@/layouts/BaseLayout.astro";
import { t } from "@/i18n/en";
const tr = t("es");
---
<BaseLayout
  title={tr("my.page.title")}
  description={tr("my.page.description")}
  locale="es"
  path="/es/my-page"
>
  <main>
    <h1>{tr("my.page.title")}</h1>
  </main>
</BaseLayout>
```

---

## Adding a Content Collection Entry

1. Add the schema to `src/content/config.ts` (if new collection).
2. Create a `.mdx` file matching the schema frontmatter.
3. Use sibling files for locales: `guide.es.mdx` / `guide.en.mdx`.

```mdx
---
title: "Mi guía"
description: "Descripción corta"
locale: "es"
publishedAt: "2026-06-01"
tags: ["tutorial"]
---

Contenido aquí.
```

---

## Type Sync from jinba-db

`src/types/database.ts` is auto-synced from `jinba-db`. To refresh:

```bash
# Reads JINBA_DB_PATH env var, or defaults to ../jinba-db/types/database.ts
npm run types:sync
```

If no source is found, a placeholder shim is committed so the project compiles.

---

## CI

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and PR to `main`:

1. `npm run lint` — Biome lint
2. `npm run typecheck` — TypeScript strict check
3. `npm run i18n:check` — dictionary key parity
4. `npm run test` — vitest unit tests
5. `npm run build` — Astro production build
6. Lighthouse CI — Performance ≥90, Accessibility ≥95, Best Practices ≥90, SEO ≥95

To run locally:
```bash
npm run lint
npm run typecheck
npm run i18n:check
npm run test
npm run build
```

E2E tests (Playwright) require browser binaries:
```bash
# Install Playwright browsers first
npx playwright install chromium
npm run test:e2e
```

> CI skips Playwright by default (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` + `SKIP_E2E=true`).
> Enable by removing `SKIP_E2E` from the workflow env.

---

## Design Decisions

See `sdd/web-f1-bootstrap/design` in engram memory (project: jinba-web) for the full decision table (24 decisions). Key choices:

- **Dark-first**: `[data-theme="light"]` override; dark base avoids FOUC with inline bootstrap script
- **Self-hosted fonts**: `@fontsource-variable/inter` — no third-party requests, better CWV
- **Server-only Supabase**: `src/lib/supabase.ts` throws at module load if imported in browser
- **Hybrid output**: static by default, per-page SSR for dynamic routes (listings, search)
- **Tailwind 4 `@theme`**: tokens live in CSS, not `tailwind.config.ts`
