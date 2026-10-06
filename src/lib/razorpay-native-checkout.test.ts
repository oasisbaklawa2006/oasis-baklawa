import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveRazorpayRuntimeEnabled } from "./razorpay-runtime-flag";

describe("native Razorpay checkout boundary", () => {
  it("keeps the public build flag fail-closed", () => {
    assert.equal(resolveRazorpayRuntimeEnabled(undefined), false);
    assert.equal(resolveRazorpayRuntimeEnabled(""), false);
    assert.equal(resolveRazorpayRuntimeEnabled("false"), false);
    assert.equal(resolveRazorpayRuntimeEnabled(" TRUE "), true);
  });

  it("never promotes the native SDK callback to payment truth", () => {
    const nativeSource = readFileSync(join(__dirname, "razorpay-native-checkout.ts"), "utf8");
    const flowSource = readFileSync(join(__dirname, "payment-gateway-flow.ts"), "utf8");

    assert.match(nativeSource, /never payment truth/);
    assert.match(nativeSource, /signed provider webhook/);
    assert.doesNotMatch(nativeSource, /navigation\.navigate|navigation\.replace|phase:\s*["']succeeded/);

    assert.match(flowSource, /fetchPaymentGatewayPayableStatus/);
    assert.match(flowSource, /isTerminalPaymentStatus/);
    assert.match(flowSource, /Waiting for signed provider confirmation/);
  });
});
