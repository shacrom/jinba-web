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

## Price ingestion cron

Price data for the fair-value calculator is sourced via [Apify](https://apify.com) paid scraping actors (Milanuncios + Wallapop). A Vercel cron endpoint pulls actor output every 6 hours, normalises it, and upserts it into the `ingested_price_points` staging table. A Postgres function (`refresh_price_aggregates_daily`) then rebuilds the `price_aggregates_daily` materialized view so all price surfaces (calculator, chart, LivePriceStats) pick up fresh data automatically.

| Variable | Required | Description |
|---|---|---|
| `APIFY_TOKEN` | Yes (for cron) | Apify API token. Server-only. Never expose in browser. |
| `APIFY_DATASET_MIL` | Yes (for cron) | Apify dataset ID for the Milanuncios actor run. |
| `APIFY_DATASET_WAL` | Yes (for cron) | Apify dataset ID for the Wallapop actor run. |
| `CRON_SECRET` | Yes (for cron) | Shared secret injected by Vercel cron. Generate with `openssl rand -hex 32`. |
| `ALERT_WEBHOOK_URL` | No | POST receives `{event, timestamp}` JSON on 0-row runs. |

### Cost monitoring

An Apify billing alert MUST be configured at **$80/month** (80% of the $100 cap) via the Apify dashboard → Billing → Alerts. This is a manual dashboard step, not a code change.

The `GET /api/cron/sync-prices` endpoint is auth-gated via `CRON_SECRET`. Vercel cron invocations inject `Authorization: Bearer <CRON_SECRET>` automatically. Do not invoke the endpoint manually except via the Vercel dashboard "Run now" button.

---

## Admin access (`/admin/scraping/`, `/admin/users`)

Admin pages are gated by Supabase Auth session. A user must be logged in with a profile whose `role` is `admin`. Non-admins receive a 404. The pages are excluded from the sitemap (`/admin/` is in `robots.txt` + `sitemap.filter`) and carry `noindex,nofollow` meta.

### First admin

After deploying and creating the first account, run this SQL via the Supabase SQL editor to promote the bootstrap admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'marmibas.dev@gmail.com');
```

Subsequent admin promotions can be done via `/admin/users` by any existing admin.

---

## Admin & data

### Ficha tecnica OCR

Users can populate the "add car" form by uploading a photo of their Spanish Ficha Tecnica / Permiso de Circulacion. OCR runs entirely in the browser via `tesseract.js` (lazy-loaded, ~3 MB chunk — not in the main bundle). The image never reaches our servers.

A PII blacklist strips any line containing `MATRICULA`, `BASTIDOR`, `VIN`, `TITULAR`, `DNI`, `NIE`, `NIF`, `DOMICILIO`, `DIRECCION`, `CALLE`, `PERMISO`, or `EXPEDICION` before any field extraction. Only the sanitised technical fields (make, model, year, power, displacement, fuel type) are shown in the review UI. On confirm, a native form POST is submitted to the existing `/[lang]/account/garage/add` endpoint — no new API route exists, no image is uploaded.

Relevant files:

- `src/lib/ficha-tecnica-parser.ts` — PII blacklist + regex field extractor (pure, testable)
- `src/lib/taxonomy-match.ts` — fuzzy make/model/year matcher against the generation taxonomy
- `src/components/islands/FichaTecnicaUpload.tsx` — React island (`client:only="react"`)
- `tests/unit/ficha-tecnica-parser.test.ts` — parser + PII filter tests
- `tests/unit/taxonomy-match.test.ts` — fuzzy matcher tests

---

## Design Decisions

See `sdd/web-f1-bootstrap/design` in engram memory (project: jinba-web) for the full decision table (24 decisions). Key choices:

- **Dark-first**: `[data-theme="light"]` override; dark base avoids FOUC with inline bootstrap script
- **Self-hosted fonts**: `@fontsource-variable/inter` — no third-party requests, better CWV
- **Server-only Supabase**: `src/lib/supabase.ts` throws at module load if imported in browser
- **Hybrid output**: static by default, per-page SSR for dynamic routes (listings, search)
- **Tailwind 4 `@theme`**: tokens live in CSS, not `tailwind.config.ts`
