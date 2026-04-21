import { PublicEnv, ServerEnv } from "@/types/env";
import { describe, expect, it } from "vitest";

const validPublicEnv = {
  PUBLIC_SITE_URL: "https://jinba.example.com",
  PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key",
};

describe("PublicEnv schema", () => {
  it("parses a valid env object", () => {
    const result = PublicEnv.safeParse(validPublicEnv);
    expect(result.success).toBe(true);
  });

  it("fails when PUBLIC_SITE_URL is missing", () => {
    const { PUBLIC_SITE_URL: _, ...rest } = validPublicEnv;
    const result = PublicEnv.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("fails when PUBLIC_SITE_URL is not a valid URL", () => {
    const result = PublicEnv.safeParse({ ...validPublicEnv, PUBLIC_SITE_URL: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("does not include SUPABASE_SERVICE_ROLE_KEY (server-only)", () => {
    const keys = Object.keys(PublicEnv.shape);
    expect(keys).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("accepts optional PUBLIC_PLAUSIBLE_DOMAIN", () => {
    const result = PublicEnv.safeParse({
      ...validPublicEnv,
      PUBLIC_PLAUSIBLE_DOMAIN: "jinba.example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("ServerEnv schema", () => {
  it("parses empty object (all fields optional)", () => {
    const result = ServerEnv.safeParse({});
    expect(result.success).toBe(true);
  });

  it("parses with SUPABASE_SERVICE_ROLE_KEY", () => {
    const result = ServerEnv.safeParse({ SUPABASE_SERVICE_ROLE_KEY: "service-key" });
    expect(result.success).toBe(true);
  });
});
