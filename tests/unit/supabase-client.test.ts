import { describe, expect, it, vi } from "vitest";

describe("supabase server-only guard", () => {
  it("throws when imported in a window-like env", async () => {
    vi.stubGlobal("window", {} as Window);
    await expect(import("@/lib/supabase")).rejects.toThrow(/server-side only/i);
    vi.unstubAllGlobals();
  });
});
