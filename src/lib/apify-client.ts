/**
 * src/lib/apify-client.ts — C01/C02/C03 (data-sources-strategy)
 *
 * Thin hand-rolled wrapper over the Apify Dataset Items API.
 * Zero new npm deps — uses fetch + AbortController.
 *
 * Design decisions (T6):
 * - No `apify-client` npm package. < 100 LOC, total control of retries, Zod
 *   integration, and error classification. Matches the meilisearch.ts pattern.
 * - Zod validation at the edge (C03 — T7): each row is parsed with
 *   ApifyListingSchema.safeParse(). >50% rejection rate on any page trips
 *   ApifyParseError so the caller can skip the tuple cleanly.
 * - One retry with 500 ms backoff on network errors (ApifyNetworkError).
 *   No retry on ApifyAuthError or ApifyParseError — those are permanent for
 *   the current invocation.
 * - AbortController enforces per-request timeout (default 45 s).
 * - Server-only guard mirrors supabase-admin.ts pattern.
 */
import { type ApifyListing, ApifyListingSchema } from "@/lib/ingest/types";

// ─── Browser-import guard ──────────────────────────────────────────────────

if (typeof window !== "undefined") {
  throw new Error(
    "[jinba-web] src/lib/apify-client.ts imported from the browser. Apify access is server-side only."
  );
}

// ─── Configuration interfaces ──────────────────────────────────────────────

export interface ApifyClientConfig {
  /** Apify API token (process.env.APIFY_TOKEN). */
  token: string;
  /** Base URL — default "https://api.apify.com/v2". Overridable in tests. */
  baseUrl?: string;
  /** Per-request timeout in ms — default 45 000. */
  timeoutMs?: number;
}

export interface PullDatasetOpts {
  /** Apify dataset ID for the scheduled actor run. */
  datasetId: string;
  /** Max items per page — default 500 (Apify API maximum). */
  limit?: number;
  /** Starting offset — default 0. Used by the pagination loop internally. */
  offset?: number;
}

// ─── Error classes ─────────────────────────────────────────────────────────

/** Thrown on network failure, AbortError (timeout), or HTTP 5xx after one retry. */
export class ApifyNetworkError extends Error {
  public readonly cause: unknown;
  constructor(msg: string, cause?: unknown) {
    super(msg);
    this.name = "ApifyNetworkError";
    this.cause = cause;
  }
}

/** Thrown on HTTP 401 or 403 from Apify. Permanent — abort the run. */
export class ApifyAuthError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ApifyAuthError";
  }
}

/**
 * Thrown when >50% of items on a page fail Zod validation. This is the
 * "schema drift" trip wire — the actor output format has changed.
 */
export class ApifyParseError extends Error {
  public readonly stats: { total: number; rejected: number };
  constructor(msg: string, stats: { total: number; rejected: number }) {
    super(msg);
    this.name = "ApifyParseError";
    this.stats = stats;
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────

const RETRY_BACKOFF_MS = 500;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    // AbortError (timeout) or network failure — both surface as ApifyNetworkError
    throw new ApifyNetworkError("Apify fetch failed", err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches one page from the Apify Dataset Items API.
 * Returns raw JSON array. Throws on auth or network errors.
 * Retries once on 5xx or network throw.
 */
async function fetchPage(
  cfg: Required<ApifyClientConfig>,
  datasetId: string,
  offset: number,
  limit: number
): Promise<unknown[]> {
  const url =
    `${cfg.baseUrl}/datasets/${encodeURIComponent(datasetId)}/items` +
    `?offset=${offset}&limit=${limit}&format=json`;

  const headers = {
    Authorization: `Bearer ${cfg.token}`,
    "Content-Type": "application/json",
  };

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      // 500 ms backoff before retry
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(url, { method: "GET", headers }, cfg.timeoutMs);
    } catch (err) {
      // Network error or timeout — will retry once
      lastError = err;
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new ApifyAuthError(`Apify auth failed: HTTP ${response.status}`);
    }

    if (response.status >= 500) {
      lastError = new ApifyNetworkError(`Apify server error: HTTP ${response.status}`);
      continue;
    }

    if (!response.ok) {
      throw new ApifyNetworkError(`Apify unexpected status: HTTP ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  // Both attempts failed
  throw lastError instanceof ApifyNetworkError
    ? lastError
    : new ApifyNetworkError("Apify fetch failed after retry", lastError);
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Pull all items from an Apify dataset, paginating automatically until a page
 * returns fewer items than `limit`. Validates each row with ApifyListingSchema.
 *
 * Throws:
 * - ApifyAuthError   — 401/403 from Apify (abort the whole run)
 * - ApifyNetworkError — network/timeout/5xx after retry (skip this tuple)
 * - ApifyParseError  — >50% of a page fails Zod (skip this tuple)
 *
 * Invalid rows under the 50% threshold are dropped and logged at warn level.
 * Valid rows are returned as ApifyListing[].
 */
export async function pullDataset(
  cfg: ApifyClientConfig,
  opts: PullDatasetOpts
): Promise<ApifyListing[]> {
  const resolvedCfg: Required<ApifyClientConfig> = {
    baseUrl: "https://api.apify.com/v2",
    timeoutMs: 45_000,
    ...cfg,
  };
  const limit = opts.limit ?? 500;
  let offset = opts.offset ?? 0;
  const results: ApifyListing[] = [];

  // Paginate until a page returns fewer rows than limit (i.e. last page)
  for (;;) {
    const rawPage = await fetchPage(resolvedCfg, opts.datasetId, offset, limit);

    if (rawPage.length === 0) break;

    // Zod-validate each row
    let rejected = 0;
    for (const item of rawPage) {
      const parsed = ApifyListingSchema.safeParse(item);
      if (parsed.success) {
        results.push(parsed.data as ApifyListing);
      } else {
        rejected++;
        // Individual row failures logged at warn — callers see them in Vercel logs
        console.warn(
          JSON.stringify({
            level: "warn",
            source: "apify-client",
            msg: "row failed Zod validation",
            issues: parsed.error.issues.slice(0, 3),
          })
        );
      }
    }

    const total = rawPage.length;
    const rejectRate = rejected / total;

    if (rejectRate > 0.5) {
      throw new ApifyParseError(
        `Apify schema drift: ${rejected}/${total} rows failed validation on dataset ${opts.datasetId}`,
        { total, rejected }
      );
    }

    offset += rawPage.length;

    // Last page: fewer rows than limit means no more pages
    if (rawPage.length < limit) break;
  }

  return results;
}
