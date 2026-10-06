import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const runtime = readFileSync(join(__dirname, "payment-provider-runtime.ts"), "utf8");
const flow = readFileSync(join(__dirname, "payment-gateway-flow.ts"), "utf8");

test("Buyer payment runtime is provider-neutral", () => {
  assert.match(runtime, /payment-provider-create-session/);
  assert.doesNotMatch(runtime, /razorpay|stripe|cashfree|payu|ccavenue/i);
  assert.match(runtime, /payment_success_requires_server_verification/);
});

test("Buyer never treats checkout launch as payment success", () => {
  assert.match(flow, /fetchPaymentGatewayPayableStatus/);
  assert.match(flow, /isTerminalPaymentStatus/);
  assert.doesNotMatch(flow, /razorpay|native checkout|payment callback/i);
});

test("Buyer accepts only HTTPS hosted checkout URLs", () => {
  assert.match(runtime, /url\.protocol === "https:"/);
});
