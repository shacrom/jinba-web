import {
  type SourceRow,
  buildSourceHealth,
  classifyErrorType,
  formatDuration,
  formatRelative,
  formatSuccessRate,
} from "@/lib/admin-scraping-format";
import { describe, expect, it } from "vitest";

describe("formatDuration", () => {
  it("handles null and undefined", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
  });
  it("returns '< 1 s' for sub-second", () => {
    expect(formatDuration(0)).toBe("< 1 s");
    expect(formatDuration(999)).toBe("< 1 s");
  });
  it("returns 'N s' below one minute", () => {
    expect(formatDuration(1000)).toBe("1 s");
    expect(formatDuration(45_000)).toBe("45 s");
    expect(formatDuration(59_999)).toBe("59 s");
  });
  it("returns 'N min M s' beyond one minute", () => {
    expect(formatDuration(60_000)).toBe("1 min 0 s");
    expect(formatDuration(125_000)).toBe("2 min 5 s");
  });
});

describe("formatRelative", () => {
  const NOW = new Date("2026-04-21T12:00:00.000Z");
  it("returns — for nullish or invalid", () => {
    expect(formatRelative(null, NOW)).toBe("—");
    expect(formatRelative(undefined, NOW)).toBe("—");
    expect(formatRelative("not-a-date", NOW)).toBe("—");
  });
  it("returns seconds then minutes, hours, days", () => {
    expect(formatRelative(new Date(NOW.getTime() - 5_000).toISOString(), NOW)).toBe("hace 5 s");
    expect(formatRelative(new Date(NOW.getTime() - 2 * 60_000).toISOString(), NOW)).toBe(
      "hace 2 min"
    );
    expect(formatRelative(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), NOW)).toBe(
      "hace 3 h"
    );
    expect(formatRelative(new Date(NOW.getTime() - 2 * 86_400_000).toISOString(), NOW)).toBe(
      "hace 2 d"
    );
  });
  it("returns 'ahora' for future timestamps", () => {
    expect(formatRelative(new Date(NOW.getTime() + 10_000).toISOString(), NOW)).toBe("ahora");
  });
});

describe("formatSuccessRate", () => {
  it("returns N/D for empty", () => {
    expect(formatSuccessRate([])).toBe("N/D");
  });
  it("computes fraction with one decimal", () => {
    expect(formatSuccessRate([{ items_errored: 0 }, { items_errored: 0 }])).toBe("100.0 %");
    expect(formatSuccessRate([{ items_errored: 0 }, { items_errored: 3 }])).toBe("50.0 %");
    expect(formatSuccessRate([{ items_errored: null }, { items_errored: 1 }])).toBe("50.0 %");
  });
});

describe("classifyErrorType", () => {
  it("buckets by prefix", () => {
    expect(classifyErrorType("http_429")).toBe("http");
    expect(classifyErrorType("HTTP_500")).toBe("http");
    expect(classifyErrorType("parse_missing_title")).toBe("parse");
    expect(classifyErrorType("privacy_blur_failed")).toBe("privacy");
    expect(classifyErrorType("random")).toBe("other");
  });
});

describe("buildSourceHealth", () => {
  const NOW = new Date("2026-04-21T12:00:00.000Z");
  const sources: SourceRow[] = [
    {
      id: 1,
      slug: "a",
      display_name: "A",
      base_url: "",
      config: {},
      created_at: "2026-04-01T00:00:00Z",
      enabled: true,
      fetch_strategy: "cheerio",
      last_run_at: null,
      rate_limit_ms: 1500,
    },
    {
      id: 2,
      slug: "b",
      display_name: "B",
      base_url: "",
      config: {},
      created_at: "2026-04-01T00:00:00Z",
      enabled: false,
      fetch_strategy: "playwright",
      last_run_at: null,
      rate_limit_ms: 1500,
    },
  ];
  it("rolls up runs per source", () => {
    const runs = [
      { source_id: 1, started_at: "2026-04-21T11:00:00Z", items_errored: 0 },
      { source_id: 1, started_at: "2026-04-21T10:00:00Z", items_errored: 2 },
      { source_id: 2, started_at: "2026-04-21T09:00:00Z", items_errored: 0 },
    ];
    const out = buildSourceHealth(sources, runs, NOW);
    expect(out).toHaveLength(2);
    expect(out[0]?.source.slug).toBe("a");
    expect(out[0]?.successRate).toBe("50.0 %");
    expect(out[0]?.lastRunAt).toBe("2026-04-21T11:00:00Z");
    expect(out[1]?.source.slug).toBe("b");
    expect(out[1]?.successRate).toBe("100.0 %");
  });
  it("returns N/D for sources without runs", () => {
    const out = buildSourceHealth(sources, [], NOW);
    expect(out[0]?.successRate).toBe("N/D");
    expect(out[0]?.lastRunAt).toBeNull();
    expect(out[0]?.lastRunDisplay).toBe("—");
  });
  it("caps at latest 10 runs per source", () => {
    // Build 15 runs for source 1, half with errors, sorted later-first so the
    // top 10 (by started_at desc) should drive the rate.
    const runs = Array.from({ length: 15 }, (_, i) => ({
      source_id: 1,
      started_at: new Date(NOW.getTime() - i * 60_000).toISOString(),
      // First 5 are clean, next 5 errored, last 5 clean — top 10 = 5 clean + 5 errored
      items_errored: i < 5 ? 0 : i < 10 ? 1 : 0,
    }));
    const out = buildSourceHealth([sources[0] as SourceRow], runs, NOW);
    expect(out[0]?.successRate).toBe("50.0 %");
  });
});
