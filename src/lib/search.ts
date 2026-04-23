import type { Locale } from "@/i18n/config";
import { meili } from "@/lib/meilisearch";
import {
  SEARCH_INDEX_UID,
  type SearchDoc,
  type SearchDocType,
  type SearchHit,
} from "@/lib/search-types";

export { SEARCH_INDEX_UID };
export type { SearchDoc, SearchDocType, SearchHit };

export function isSearchConfigured(): boolean {
  return meili !== null;
}

export async function searchContent(
  query: string,
  opts: { locale: Locale; limit?: number } = { locale: "es" }
): Promise<SearchHit[]> {
  if (!meili) return [];
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const index = meili.index<SearchDoc>(SEARCH_INDEX_UID);
  const result = await index.search(trimmed, {
    filter: [`locale = "${opts.locale}"`],
    limit: opts.limit ?? 20,
    attributesToRetrieve: [
      "objectID",
      "type",
      "locale",
      "title",
      "description",
      "url",
      "tags",
      "make",
      "model",
      "generation",
      "serviceType",
      "region",
    ],
  });
  return result.hits as SearchHit[];
}
