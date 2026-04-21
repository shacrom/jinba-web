import { diffKeys } from "@/i18n/check-parity";
import { describe, expect, it } from "vitest";

describe("i18n", () => {
  it("ES and EN dictionaries have the same keys", () => {
    const { missingInEn, missingInEs } = diffKeys();
    expect(missingInEn).toEqual([]);
    expect(missingInEs).toEqual([]);
  });
});
