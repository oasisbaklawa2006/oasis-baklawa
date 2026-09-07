import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  derivePayableState,
  isPaymentGatewayBound,
  isTerminalPaymentStatus,
  resolvePaymentGatewayBoundary,
} from "./payment-gateway-boundary";
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
  it("treats gateway as bound when Core RPCs are allowlisted", () => {
    const boundarySource = readFileSync(join(ROOT, "../scripts/verify-contract-boundary.mjs"), "utf8");
    assert.equal(isPaymentGatewayBound(BUYER_BOUND_PAYMENT_GATEWAY_RPCS), true);
    for (const rpc of BUYER_BOUND_PAYMENT_GATEWAY_RPCS) {
      assert.match(boundarySource, new RegExp(`"${rpc}"`));
    }
  });

  it("derives payable state only from customer-safe finance facts", () => {
    const payable = derivePayableState(financeFacts);
    assert.ok(payable);
    assert.equal(payable?.requiredAdvance, 3000);
    assert.equal(payable?.balanceDue, 10000);
    assert.equal(payable?.advanceCovered, false);
  });

  it("enables initiation when gateway RPCs are bound and advance is due", () => {
    const boundary = resolvePaymentGatewayBoundary(financeFacts, BUYER_BOUND_PAYMENT_GATEWAY_RPCS);
    assert.equal(boundary.canInitiatePayment, true);
    assert.equal(boundary.blockedReason, null);
  });

  it("blocks initiation when advance is already covered", () => {
    const coveredFacts = { ...financeFacts, advance_covered: true, covered_amount: 3000 };
    const boundary = resolvePaymentGatewayBoundary(coveredFacts, BUYER_BOUND_PAYMENT_GATEWAY_RPCS);
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /already covered/i);
  });

  it("never enables initiation offline even when gateway RPCs are bound", () => {
    const boundary = resolvePaymentGatewayBoundary(financeFacts, BUYER_BOUND_PAYMENT_GATEWAY_RPCS, { isOnline: false });
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /offline/i);
  });
});

describe("payment gateway flow", () => {
  it("classifies terminal gateway statuses without inventing success", () => {
    assert.equal(isTerminalPaymentStatus("succeeded"), "success");
    assert.equal(isTerminalPaymentStatus("failed"), "failure");
    assert.equal(isTerminalPaymentStatus("pending"), "pending");
  });
});
