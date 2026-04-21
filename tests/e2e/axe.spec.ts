import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SKIP_E2E = process.env.SKIP_E2E === "true";

test.describe.configure({ mode: "serial" });

const locales = ["/es/", "/en/"];

for (const path of locales) {
  test(`${path} — zero critical/serious axe violations`, async ({ page }) => {
    if (SKIP_E2E) {
      test.skip(true, "SKIP_E2E=true — Playwright binaries not available");
    }
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const criticalOrSerious = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? "")
    );

    expect(
      criticalOrSerious,
      `axe violations on ${path}: ${JSON.stringify(
        criticalOrSerious.map((v) => v.id),
        null,
        2
      )}`
    ).toHaveLength(0);
  });
}
