// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

describe("supabase-admin server-only guard", () => {
  it("throws when imported in a window-like env", async () => {
    vi.stubGlobal("window", {} as Window);
    await expect(import("@/lib/supabase-admin")).rejects.toThrow(/server-side only/i);
    vi.unstubAllGlobals();
  });
});
