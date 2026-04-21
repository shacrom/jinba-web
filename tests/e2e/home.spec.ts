import { expect, test } from "@playwright/test";

const SKIP_E2E = process.env.SKIP_E2E === "true";

test.describe("Home page", () => {
  test.beforeEach((_, testInfo) => {
    if (SKIP_E2E) testInfo.skip();
  });

  test("/ redirects to /es/", async ({ page }) => {
    const response = await page.goto("/");
    expect(page.url()).toContain("/es/");
    expect(response?.status()).toBeLessThan(400);
  });

  test("/es/ has visible <h1>", async ({ page }) => {
    await page.goto("/es/");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test("/en/ has visible <h1>", async ({ page }) => {
    await page.goto("/en/");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test("email form shows error on invalid input", async ({ page }) => {
    await page.goto("/es/");
    const input = page.locator("#email-signup");
    await input.fill("not-an-email");
    await page.keyboard.press("Enter");
    const errorMsg = page.locator("[role='alert']");
    await expect(errorMsg).toBeVisible();
  });

  test("email form accepts valid email without network request", async ({ page }) => {
    await page.goto("/es/");
    // Intercept any network requests to ensure none are made
    let networkCalled = false;
    page.on("request", (req) => {
      if (!req.url().includes("plausible.io")) networkCalled = true;
    });
    const input = page.locator("#email-signup");
    await input.fill("test@example.com");
    await page.keyboard.press("Enter");
    // No error alert
    const errorMsg = page.locator("[role='alert']");
    await expect(errorMsg).not.toBeVisible();
    expect(networkCalled).toBe(false);
  });
});
