import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  derivePayableState,
  isPaymentGatewayBound,
  PAYMENT_GATEWAY_RPCS,
  resolvePaymentGatewayBoundary,
} from "./payment-gateway-boundary";
import type { CustomerFinanceFacts } from "@/types/database.types";

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
  it("does not treat gateway as bound until both RPCs are allowlisted", () => {
    const boundarySource = readFileSync(join(ROOT, "../scripts/verify-contract-boundary.mjs"), "utf8");
    const allowed = [...boundarySource.matchAll(/"([a-z0-9_]+)"/g)].map((match) => match[1]);
    assert.equal(isPaymentGatewayBound(allowed), false);
    assert.equal(PAYMENT_GATEWAY_RPCS.length, 2);
  });

  it("derives payable state only from customer-safe finance facts", () => {
    const payable = derivePayableState(financeFacts);
    assert.ok(payable);
    assert.equal(payable?.requiredAdvance, 3000);
    assert.equal(payable?.balanceDue, 10000);
    assert.equal(payable?.advanceCovered, false);
  });

  it("blocks payment initiation when gateway RPCs are unbound", () => {
    const boundary = resolvePaymentGatewayBoundary(financeFacts, ["calculate_customer_advance_v1"]);
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /not yet bound/i);
  });

  it("blocks initiation when advance is already covered", () => {
    const coveredFacts = { ...financeFacts, advance_covered: true, covered_amount: 3000 };
    const boundary = resolvePaymentGatewayBoundary(coveredFacts, [...PAYMENT_GATEWAY_RPCS]);
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /already covered/i);
  });

  it("never enables initiation offline even when gateway RPCs are bound", () => {
    const boundary = resolvePaymentGatewayBoundary(financeFacts, [...PAYMENT_GATEWAY_RPCS], { isOnline: false });
    assert.equal(boundary.canInitiatePayment, false);
    assert.match(boundary.blockedReason ?? "", /offline/i);
  });
});
