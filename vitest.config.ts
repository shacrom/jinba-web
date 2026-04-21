import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environmentMatchGlobs: [["tests/unit/supabase-client.test.ts", "jsdom"]],
    environment: "node",
  },
});
