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
  "Quotations",
  "QuotationDetail",
  "OrderPayment",
  "SessionRecovery",
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

  it("does not keep DocumentsScreen on BLOCKED-BACKEND stub", () => {
    const source = readFileSync(join(ROOT, "screens/DocumentsScreen.tsx"), "utf8");
    assert.doesNotMatch(source, /BLOCKED-BACKEND/);
    assert.match(source, /customerGateway\.documents\(\)/);
  });

  it("routes general support through governed general-query contract", () => {
    const source = readFileSync(join(ROOT, "screens/SupportScreen.tsx"), "utf8");
    assert.match(source, /submitGeneralQuery/);
    assert.match(source, /getGeneralQueryIdempotencyKey/);
    assert.doesNotMatch(source, /orderId:\s*""/);
  });

  it("loads governed quotations through customerGateway", () => {
    const source = readFileSync(join(ROOT, "screens/QuotationsScreen.tsx"), "utf8");
    assert.match(source, /customerGateway\.quotations\(\)/);
    assert.doesNotMatch(source, /isQuoteBackendAvailable/);
  });

  it("accepts quotations via governed handoff without checkout navigation", () => {
    const source = readFileSync(join(ROOT, "screens/QuotationDetailScreen.tsx"), "utf8");
    assert.match(source, /acceptQuotation/);
    assert.match(source, /getQuoteAcceptIdempotencyKey/);
    assert.doesNotMatch(source, /navigate\("Checkout"\)/);
    assert.doesNotMatch(source, /submit_customer_order_v1/);
  });

  it("registers all stack routes in RootNavigator", () => {
    const navSource = readFileSync(join(ROOT, "navigation/RootNavigator.tsx"), "utf8");
    for (const route of STACK_ROUTES) {
      assert.match(navSource, new RegExp(`name="${route}"`));
    }
  });

  it("binds product surfaces to governed publication authority only", () => {
    const catalogueApi = readFileSync(join(ROOT, "lib/api/catalogue.ts"), "utf8");
    assert.match(catalogueApi, /published_products_v1/);
    assert.match(catalogueApi, /normalizePublishedProducts/);
    assert.doesNotMatch(catalogueApi, /\.from\(\s*['"]products['"]\s*\)/);

    const detailSource = readFileSync(join(ROOT, "screens/ProductDetailScreen.tsx"), "utf8");
    assert.match(detailSource, /fetchCatalogue/);
    assert.match(detailSource, /Product not found in the published catalogue/);
  });

  it("binds order surfaces to governed commercial validation contract", () => {
    for (const file of ["screens/CatalogueScreen.tsx", "screens/CartScreen.tsx", "screens/CheckoutScreen.tsx"]) {
      const source = readFileSync(join(ROOT, file), "utf8");
      assert.match(source, /buyer-commercial-validation/);
    }
  });

  it("exposes five buyer tabs in MainTabNavigator", () => {
    const navSource = readFileSync(join(ROOT, "navigation/MainTabNavigator.tsx"), "utf8");
    for (const tab of ["Catalogue", "Orders", "Dashboard", "Support", "Account"]) {
      assert.match(navSource, new RegExp(`name="${tab}"`));
    }
  });

  it("routes Oasis Genie parsed lines through governed draft handoff", () => {
    const source = readFileSync(join(ROOT, "screens/AiOrderScreen.tsx"), "utf8");
    assert.match(source, /resolveGenieLines/);
    assert.match(source, /commitGenieResolvedLineToDraft/);
    assert.match(source, /genieDraftLineWriter/);
    assert.match(source, /navigation\.navigate\("Cart"\)/);
    assert.match(source, /Clarify:/);
  });

  it("consumes server finance facts in payment boundary without simulated success", () => {
    const paymentScreen = readFileSync(join(ROOT, "screens/OrderPaymentScreen.tsx"), "utf8");
    const flowSource = readFileSync(join(ROOT, "lib/payment-gateway-flow.ts"), "utf8");
    assert.match(paymentScreen, /resolvePaymentGatewayBoundary/);
    assert.match(paymentScreen, /initiateAdvancePayment/);
    assert.match(paymentScreen, /customerGateway\.financeFacts/);
    assert.match(paymentScreen, /never marks payment success locally/i);
    assert.match(flowSource, /fetchCustomerPaymentIntentStatus/);
    assert.doesNotMatch(flowSource, /phase:\s*"succeeded"[\s\S]*without/);
  });

  it("routes Genie multimodal intake through governed adapter", () => {
    const source = readFileSync(join(ROOT, "lib/genie-intake.ts"), "utf8");
    assert.match(source, /parseGenieIntake/);
    assert.match(source, /DocumentPicker/);
    assert.match(source, /ImagePicker/);
    assert.match(readFileSync(join(ROOT, "screens/AiOrderScreen.tsx"), "utf8"), /parseGenieIntake/);
  });

  it("surfaces payable navigation from order detail and dashboard alerts", () => {
    const orderDetail = readFileSync(join(ROOT, "screens/OrderDetailScreen.tsx"), "utf8");
    const dashboard = readFileSync(join(ROOT, "screens/DashboardScreen.tsx"), "utf8");
    assert.match(orderDetail, /navigate\("OrderPayment"/);
    assert.match(orderDetail, /verified_payment_amount/);
    assert.match(dashboard, /navigate\("AiOrder"\)/);
    assert.match(dashboard, /navigate\("OrderPayment"/);
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
