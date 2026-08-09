import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isCheckoutSubmitEnabled } from "./checkout-submit-guards";

const ROOT = join(__dirname, "..");

const STACK_ROUTES = [
  "Splash",
  "Onboarding",
  "Welcome",
  "Login",
  "Register",
  "AccessPending",
  "AccessRejected",
  "MainTabs",
  "ProductDetail",
  "OrderDetail",
  "QuickOrder",
  "AiOrder",
  "Cart",
  "Checkout",
  "Documents",
] as const;

function walkScreens(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walkScreens(path));
    else if (entry.endsWith(".tsx")) files.push(path);
  }
  return files;
}

describe("golden journey invariants", () => {
  it("blocks checkout submission when offline", () => {
    assert.equal(
      isCheckoutSubmitEnabled({
        checkoutReady: true,
        orderValue: 2500,
        submitting: false,
        keyReady: true,
        idempotencyKey: "key",
        keyPersisted: true,
        advanceState: { status: "resolved", amount: 500 },
        isOnline: false,
      }),
      false
    );
  });

  it("does not ship runtime SAMPLE_ mock commerce data in screens", () => {
    const hits: string[] = [];
    for (const file of walkScreens(join(ROOT, "screens"))) {
      const source = readFileSync(file, "utf8");
      if (/SAMPLE_(LINES|DOCS)|ORDER_VALUE\s*=/.test(source)) hits.push(file);
    }
    assert.deepEqual(hits, []);
  });

  it("registers all stack routes in RootNavigator", () => {
    const navSource = readFileSync(join(ROOT, "navigation/RootNavigator.tsx"), "utf8");
    for (const route of STACK_ROUTES) {
      assert.match(navSource, new RegExp(`name="${route}"`));
    }
  });

  it("exposes five buyer tabs in MainTabNavigator", () => {
    const navSource = readFileSync(join(ROOT, "navigation/MainTabNavigator.tsx"), "utf8");
    for (const tab of ["Catalogue", "Orders", "Dashboard", "Support", "Account"]) {
      assert.match(navSource, new RegExp(`name="${tab}"`));
    }
  });
});

describe("double-submit money safety", () => {
  const base = {
    checkoutReady: true,
    orderValue: 1000,
    keyReady: true,
    idempotencyKey: "uuid",
    keyPersisted: true,
    advanceState: { status: "resolved" as const, amount: 200 },
    isOnline: true,
  };

  it("blocks while submission is in flight", () => {
    assert.equal(isCheckoutSubmitEnabled({ ...base, submitting: true }), false);
  });

  it("requires persisted idempotency key before enabling submit", () => {
    assert.equal(isCheckoutSubmitEnabled({ ...base, submitting: false, keyPersisted: false, idempotencyKey: null }), false);
  });
});
