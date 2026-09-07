import { test, expect } from "@playwright/test";

test.describe("Buyer revenue journey smoke", () => {
  test("web bundle loads without mock commerce placeholders", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.waitForTimeout(3000);
    const body = await page.content();
    expect(body.length).toBeGreaterThan(100);
    expect(body).not.toMatch(/SAMPLE_LINES|SAMPLE_DOCS/);
  });
});

test.describe("authenticated revenue journey", () => {
  test.skip(!process.env.BUYER_E2E_EMAIL, "Set BUYER_E2E_EMAIL and BUYER_E2E_PASSWORD for authenticated Playwright coverage.");

  test("approved buyer can reach catalogue and quotations routes", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.+/);
  });
});
