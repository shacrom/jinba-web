import { computeReadingTime, extractHeadings, guideSlug, slugify } from "@/lib/reading-time";
import { describe, expect, it } from "vitest";

describe("computeReadingTime", () => {
  it("returns 1 minute as the floor for short bodies", () => {
    expect(computeReadingTime("hi")).toBe(1);
    expect(computeReadingTime("")).toBe(1);
    expect(computeReadingTime(undefined)).toBe(1);
  });

  it("rounds up by character count at 1200 chars/min", () => {
    // Exactly 1200 chars should be 1 minute.
    expect(computeReadingTime("a".repeat(1200))).toBe(1);
    // 1201 chars flips to 2 minutes.
    expect(computeReadingTime("a".repeat(1201))).toBe(2);
    // 2500 chars → ceil(2500/1200) = 3.
    expect(computeReadingTime("a".repeat(2500))).toBe(3);
    // 5999 chars → ceil(5999/1200) = 5.
    expect(computeReadingTime("a".repeat(5999))).toBe(5);
  });

  it("honors a positive override from frontmatter", () => {
    expect(computeReadingTime("a".repeat(10_000), 3)).toBe(3);
    expect(computeReadingTime(undefined, 7)).toBe(7);
  });

  it("ignores non-positive overrides and falls back to computation", () => {
    expect(computeReadingTime("a".repeat(3000), 0)).toBe(3);
    expect(computeReadingTime("a".repeat(3000), -2)).toBe(3);
  });
});

describe("slugify", () => {
  it("lowercases, strips diacritics, and collapses separators", () => {
    expect(slugify("Cómo inspeccionar un MX-5 NA")).toBe("como-inspeccionar-un-mx-5-na");
    expect(slugify("¿Qué buscar en el motor B6?")).toBe("que-buscar-en-el-motor-b6");
    expect(slugify("Engine & gearbox")).toBe("engine-gearbox");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("-- hello --")).toBe("hello");
  });

  it("returns empty string for pure symbols", () => {
    expect(slugify("---")).toBe("");
  });
});

describe("guideSlug", () => {
  it("strips the locale suffix left by Astro 6 github-slugger", () => {
    // sample.es.mdx → id = "samplees" → slug = "sample"
    expect(guideSlug("samplees", "es")).toBe("sample");
    expect(guideSlug("sampleen", "en")).toBe("sample");
  });

  it("handles multi-segment ids with dashes", () => {
    expect(guideSlug("mx5-na-inspectiones", "es")).toBe("mx5-na-inspection");
    expect(guideSlug("nissan-240z-historyen", "en")).toBe("nissan-240z-history");
    expect(guideSlug("buyers-guide-generales", "es")).toBe("buyers-guide-general");
  });

  it("strips a dangling dash when the filename uses foo-es convention", () => {
    expect(guideSlug("foo-es", "es")).toBe("foo");
  });

  it("returns the id unchanged when locale suffix is missing (defensive)", () => {
    expect(guideSlug("something", "es")).toBe("something");
  });
});

describe("extractHeadings", () => {
  it("returns an empty list for undefined/empty bodies", () => {
    expect(extractHeadings(undefined)).toEqual([]);
    expect(extractHeadings("")).toEqual([]);
    expect(extractHeadings("Just a paragraph, no headings.")).toEqual([]);
  });

  it("extracts only top-level h2 headings", () => {
    const body = [
      "# h1 ignored",
      "",
      "## First section",
      "",
      "Some text.",
      "",
      "### h3 ignored",
      "",
      "## Second Section",
      "",
      "More text.",
    ].join("\n");
    expect(extractHeadings(body)).toEqual([
      { id: "first-section", title: "First section" },
      { id: "second-section", title: "Second Section" },
    ]);
  });

  it("strips markdown emphasis in heading titles", () => {
    const body = "## **Bold** and _italic_ and `code`";
    const [h] = extractHeadings(body);
    expect(h.title).toBe("Bold and italic and code");
    expect(h.id).toBe("bold-and-italic-and-code");
  });
});
