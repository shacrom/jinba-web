import { defineConfig, devices } from "@playwright/test";

const SKIP_E2E = process.env.SKIP_E2E === "true";

export default defineConfig({
  testDir: "tests/e2e",
  baseURL: "http://localhost:4321",
  retries: SKIP_E2E ? 0 : 1,
  projects: SKIP_E2E
    ? []
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ],
  webServer: SKIP_E2E
    ? undefined
    : {
        command: "npm run preview",
        url: "http://localhost:4321",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
