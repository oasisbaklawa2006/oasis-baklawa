import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");
const PAYMENT_RPCS = ["create_customer_payment_intent_v1", "customer_payment_intent_status_v1"];

describe("revenue journey integration wiring", () => {
  it("binds payment gateway adapters through api and customerGateway", () => {
    const apiSource = readFileSync(join(ROOT, "lib/api/payment-gateway.ts"), "utf8");
    const gatewaySource = readFileSync(join(ROOT, "services/customerGateway.ts"), "utf8");
    const flowSource = readFileSync(join(ROOT, "lib/payment-gateway-flow.ts"), "utf8");
    for (const rpc of PAYMENT_RPCS) {
      assert.match(apiSource, new RegExp(`"${rpc}"`));
    }
    assert.match(gatewaySource, /createPaymentIntent/);
    assert.match(gatewaySource, /paymentIntentStatus/);
    assert.match(flowSource, /createCustomerPaymentIntent/);
    assert.match(flowSource, /fetchCustomerPaymentIntentStatus/);
  });

  it("routes Genie intake through governed edge adapter", () => {
    const intakeSource = readFileSync(join(ROOT, "lib/genie-intake.ts"), "utf8");
    const parseSource = readFileSync(join(ROOT, "lib/genie-order-parse.ts"), "utf8");
    assert.match(intakeSource, /invokeGenieOrderParse/);
    assert.match(parseSource, /ai-order-parse/);
    assert.doesNotMatch(readFileSync(join(ROOT, "screens/AiOrderScreen.tsx"), "utf8"), /supabase\.functions\.invoke/);
  });

  it("includes Playwright revenue journey scaffold", () => {
    const spec = readFileSync(join(process.cwd(), "e2e/revenue-journey.spec.ts"), "utf8");
    assert.match(spec, /Buyer revenue journey smoke/);
    assert.match(spec, /authenticated revenue journey/);
  });
});
