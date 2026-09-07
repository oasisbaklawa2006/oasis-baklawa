import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isRuntimePaymentGatewayBound,
  readRuntimeDeploymentRpcAllowlist,
  readRuntimePaymentGatewayBoundRpcs,
  setRuntimePaymentGatewayBoundRpcsForTests,
} from "./runtime-payment-gateway-binding";
import { BUYER_BOUND_PAYMENT_GATEWAY_RPCS } from "@/types/payment-gateway-contract";

describe("runtime payment gateway binding", () => {
  it("derives bound RPCs from deployment allowlist rather than contract aliases", () => {
    setRuntimePaymentGatewayBoundRpcsForTests(["create_payment_gateway_payable_intent_v1"]);
    assert.equal(isRuntimePaymentGatewayBound(), false);
    setRuntimePaymentGatewayBoundRpcsForTests(null);
    assert.equal(readRuntimePaymentGatewayBoundRpcs().length, BUYER_BOUND_PAYMENT_GATEWAY_RPCS.length);
  });

  it("reads deployment allowlist synced with verify-contract-boundary.mjs", () => {
    const boundarySource = readFileSync(join(process.cwd(), "scripts/verify-contract-boundary.mjs"), "utf8");
    for (const rpc of readRuntimeDeploymentRpcAllowlist()) {
      assert.ok(boundarySource.includes(`"${rpc}"`));
    }
  });
});
