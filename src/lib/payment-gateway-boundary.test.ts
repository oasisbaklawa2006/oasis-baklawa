import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  derivePayableState,
  isPaymentGatewayBound,
  isTerminalPaymentStatus,
  resolvePaymentGatewayBoundary,
} from "./payment-gateway-boundary";
import {
  isRuntimePaymentGatewayBound,
  readRuntimePaymentGatewayBoundRpcs,
  setRuntimePaymentGatewayBoundRpcsForTests,
} from "./runtime-payment-gateway-binding";
import type { CustomerFinanceFacts } from "@/types/database.types";
import { BUYER_BOUND_PAYMENT_GATEWAY_RPCS } from "@/types/payment-gateway-contract";

const ROOT = join(__dirname, "..");

const financeFacts: CustomerFinanceFacts = {
  order_id: "o1",
  order_number: "SO-100",
  commercial_version_id: null,
  commercial_version_number: null,
  commercial_value: 10000,
  required_advance: 3000,
  pi_id: "pi1",
  pi_number: "PI-100",
  pi_status: "issued",
  verified_payment_amount: 0,
  wallet_applied_amount: 0,
  approved_credit_amount: 0,
  covered_amount: 0,
  advance_covered: false,
  finance_status: "advance_pending",
  facts_as_of: "2026-09-07T00:00:00Z",
  customer_safe_projection: true,
};

describe("payment gateway boundary", () => {
  beforeEach(() => {
    setRuntimePaymentGatewayBoundRpcsForTests(null);
  });

  it("treats gateway as bound when runtime deployment includes Core RPCs", () => {
    const boundarySource = readFileSync(join(ROOT, "../scripts/verify-contract-boundary.mjs"), "utf8");
    assert.equal(isRuntimePaymentGatewayBound(), true);
    for (const rpc of BUYER_BOUND_PAYMENT_GATEWAY_RPCS) {
      assert.ok(boundarySource.includes(`"${rpc}"`));
    }
  });

  it("derives payable state only from customer-safe finance facts", () => {
    const payable = derivePayableState(financeFacts);
    assert.ok(payable);
    assert.equal(payable?.requiredAdvance, 3000);
    assert.equal(payable?.balanceDue, 10000);
    assert.equal(payable?.advanceCovered, false);
  });

  it("blocks initiation when runtime binding omits a required gateway RPC", () => {
    setRuntimePaymentGatewayBoundRpcsForTests(
      readRuntimePaymentGatewayBoundRpcs().filter((rpc) => rpc !== "create_customer_payment_intent_v1")
    );
    const boundary = resolvePaymentGatewayBoundary(financeFacts);
    assert.equal(boundary.gatewayBound, false);
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /not yet bound/i);
  });

  it("enables initiation when runtime binding includes required gateway RPCs", () => {
    const boundary = resolvePaymentGatewayBoundary(financeFacts);
    assert.equal(boundary.canInitiatePayment, true);
    assert.equal(boundary.blockedReason, null);
  });

  it("blocks initiation when advance is already covered", () => {
    const coveredFacts = { ...financeFacts, advance_covered: true, covered_amount: 3000 };
    const boundary = resolvePaymentGatewayBoundary(coveredFacts);
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /already covered/i);
  });

  it("never enables initiation offline even when gateway RPCs are bound", () => {
    const boundary = resolvePaymentGatewayBoundary(financeFacts, { isOnline: false });
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /offline/i);
  });

  it("uses deployment allowlist independently from contract constants in explicit probes", () => {
    const deploymentOnly = ["published_products_v1"];
    assert.equal(isPaymentGatewayBound(deploymentOnly), false);
    assert.equal(isPaymentGatewayBound([...BUYER_BOUND_PAYMENT_GATEWAY_RPCS]), true);
  });
});

describe("payment gateway flow", () => {
  it("classifies terminal gateway statuses without inventing success", () => {
    assert.equal(isTerminalPaymentStatus("succeeded"), "success");
    assert.equal(isTerminalPaymentStatus("failed"), "failure");
    assert.equal(isTerminalPaymentStatus("pending"), "pending");
  });
});
