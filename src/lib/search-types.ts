export type SearchDocType = "model" | "guide" | "service";

export type SearchDoc = {
  objectID: string;
  type: SearchDocType;
  locale: "es" | "en";
  title: string;
  description: string;
  url: string;
  tags: string[];
  make?: string;
  model?: string;
  generation?: string;
  serviceType?: "workshop" | "homologation" | "parts" | "media";
  region?: string;
};

export type SearchHit = SearchDoc & { _score?: number };

export const SEARCH_INDEX_UID = "jinba-content";
