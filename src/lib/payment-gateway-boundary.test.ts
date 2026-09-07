import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  derivePayableState,
  isPaymentGatewayBound,
  isTerminalPaymentStatus,
  resolvePaymentGatewayBoundary,
  resolvePaymentPurpose,
} from "./payment-gateway-boundary";
import {
  isRuntimePaymentGatewayBound,
  readRuntimePaymentGatewayBoundRpcs,
  setRuntimePaymentGatewayBoundRpcsForTests,
} from "./runtime-payment-gateway-binding";
import type { CustomerFinanceFacts, CustomerFinalPaymentRequest } from "@/types/database.types";
import { BUYER_BOUND_PAYMENT_GATEWAY_RPCS } from "@/types/payment-gateway-contract";

const ROOT = join(__dirname, "..");

const financeFacts: CustomerFinanceFacts = {
  order_id: "o1",
  order_number: "SO-100",
  commercial_version_id: "cv1",
  commercial_version_number: 1,
  commercial_value: 10000,
  required_advance: 3000,
  pi_id: "pi1",
  pi_number: "PI-100",
  pi_status: "ISSUED",
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

  it("treats gateway as bound when runtime deployment includes Core #255 RPCs", () => {
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
    assert.equal(payable?.paymentPurpose, "advance");
    assert.equal(payable?.payableAmount, 3000);
  });

  it("prefers final payment purpose when governed final-payment facts are due", () => {
    const finalPayment: CustomerFinalPaymentRequest = {
      order_id: "o1",
      available: true,
      final_payment_request_id: "fpr1",
      pi_id: "pi1",
      customer_visible_pi_number: "PI-100",
      revision_number: 1,
      effective_status: "PAYMENT_DUE",
      commercial_version_id: "cv1",
      currency: "INR",
      final_payable_total: 7000,
      verified_payment_total: 3000,
      wallet_applied_total: 0,
      approved_credit_total: 0,
      credited_or_paid_total: 3000,
      balance_due: 4000,
      settled: false,
      payment_action: "PAY",
      payment_instructions: "Pay the balance due via gateway.",
      customer_safe_projection: true,
    };
    const purpose = resolvePaymentPurpose({ ...financeFacts, advance_covered: true, covered_amount: 3000 }, finalPayment);
    assert.equal(purpose.purpose, "final_payment");
    assert.equal(purpose.payableAmount, 4000);
  });

  it("blocks initiation when runtime binding omits a required gateway RPC", () => {
    setRuntimePaymentGatewayBoundRpcsForTests(
      readRuntimePaymentGatewayBoundRpcs().filter((rpc) => rpc !== "create_payment_gateway_payable_intent_v1")
    );
    const boundary = resolvePaymentGatewayBoundary(financeFacts);
    assert.equal(boundary.gatewayBound, false);
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /unavailable in this Buyer build/i);
  });

  it("enables initiation when runtime binding includes required gateway RPCs", () => {
    const boundary = resolvePaymentGatewayBoundary(financeFacts);
    assert.equal(boundary.canInitiatePayment, true);
    assert.equal(boundary.blockedReason, null);
  });

  it("blocks initiation when PI/commercial binding is missing", () => {
    const incompleteFacts = { ...financeFacts, pi_id: null, commercial_version_id: null };
    const boundary = resolvePaymentGatewayBoundary(incompleteFacts);
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /Commercial version or PI binding/i);
  });

  it("blocks initiation when no payable balance remains", () => {
    const settledFacts = {
      ...financeFacts,
      advance_covered: true,
      covered_amount: 10000,
      required_advance: 3000,
      commercial_value: 10000,
    };
    const boundary = resolvePaymentGatewayBoundary(settledFacts);
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /No server-authoritative payable balance/i);
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
    assert.equal(isTerminalPaymentStatus("success"), "success");
    assert.equal(isTerminalPaymentStatus("succeeded"), "success");
    assert.equal(isTerminalPaymentStatus("failed"), "failure");
    assert.equal(isTerminalPaymentStatus("pending"), "pending");
  });
});
