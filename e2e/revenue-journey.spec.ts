import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const hasAuthCreds =
  Boolean(process.env.BUYER_E2E_EMAIL) &&
  Boolean(process.env.BUYER_E2E_PASSWORD) &&
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

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
  test.skip(
    !hasAuthCreds,
    "Set BUYER_E2E_EMAIL, BUYER_E2E_PASSWORD, EXPO_PUBLIC_SUPABASE_URL, and EXPO_PUBLIC_SUPABASE_ANON_KEY for authenticated Playwright coverage."
  );

  test.beforeEach(async ({ page }) => {
    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.BUYER_E2E_EMAIL!,
      password: process.env.BUYER_E2E_PASSWORD!,
    });
    if (error || !data.session) {
      test.skip(true, `Authenticated session unavailable: ${error?.message ?? "missing session"}`);
    }

    await page.goto("/");
    await page.evaluate(
      ({ accessToken, refreshToken }) => {
        localStorage.setItem(
          `sb-${window.location.hostname.split(".")[0]}-auth-token`,
          JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: "bearer",
          })
        );
      },
      {
        accessToken: data.session!.access_token,
        refreshToken: data.session!.refresh_token,
      }
    );
    await page.reload({ waitUntil: "domcontentloaded" });
  });

  test("approved buyer can reach catalogue and quotations routes", async ({ page }) => {
    await page.goto("/Catalogue");
    await expect(page).toHaveURL(/Catalogue/i);
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/Quotations");
    await expect(page).toHaveURL(/Quotations/i);
    await expect(page.locator("body")).toBeVisible();
  });
});
