import { MeiliSearch } from "meilisearch";
import type { RecordAny, SearchResponse } from "meilisearch";

const meiliUrl = import.meta.env.PUBLIC_MEILI_URL as string | undefined;
const meiliPublicKey = import.meta.env.PUBLIC_MEILI_PUBLIC_KEY as string | undefined;

/**
 * Meilisearch client initialized from public env vars (read-only search key).
 * Null when PUBLIC_MEILI_URL or PUBLIC_MEILI_PUBLIC_KEY are not configured.
 * Safe for browser use — uses public/search key only.
 */
export const meili: MeiliSearch | null =
  meiliUrl && meiliPublicKey ? new MeiliSearch({ host: meiliUrl, apiKey: meiliPublicKey }) : null;

/**
 * Typed search wrapper — to be implemented in product modules (M3, M4).
 * Throws NotImplementedError in F1 scaffold.
 */
export async function search<T extends RecordAny>(
  indexUid: string,
  query: string,
  options?: Record<string, unknown>
): Promise<SearchResponse<T>> {
  if (!meili) {
    throw new Error(
      "[jinba-web] Meilisearch is not configured. Set PUBLIC_MEILI_URL and PUBLIC_MEILI_PUBLIC_KEY."
    );
  }
  const index = meili.index<T>(indexUid);
  return index.search(query, options);
}
