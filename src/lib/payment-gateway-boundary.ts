import type { CustomerFinanceFacts, CustomerFinalPaymentRequest } from "@/types/database.types";
import { BUYER_BOUND_PAYMENT_GATEWAY_RPCS, type PaymentGatewayPurpose } from "@/types/payment-gateway-contract";
import {
  isRuntimePaymentGatewayBound,
  readRuntimeDeploymentRpcAllowlist,
} from "@/lib/runtime-payment-gateway-binding";

/** Core gateway RPCs certified on production Core main cd078c52 (#255). */
export const PAYMENT_GATEWAY_RPCS = BUYER_BOUND_PAYMENT_GATEWAY_RPCS;

export type PaymentGatewayPhase = "unbound" | "ready" | "pending" | "succeeded" | "failed";

export interface PayableState {
  orderId: string;
  orderNumber: string;
  commercialValue: number | null;
  requiredAdvance: number | null;
  verifiedPaymentAmount: number | null;
  coveredAmount: number | null;
  advanceCovered: boolean;
  balanceDue: number | null;
  financeStatus: string | null;
  piNumber: string | null;
  piStatus: string | null;
  piId: string | null;
  commercialVersionId: string | null;
  paymentPurpose: PaymentGatewayPurpose | null;
  payableAmount: number | null;
  finalPaymentStatus: string | null;
  finalPaymentInstructions: string | null;
}

export interface PaymentGatewayBoundaryState {
  gatewayBound: boolean;
  payable: PayableState | null;
  canInitiatePayment: boolean;
  blockedReason: string | null;
}

export function isPaymentGatewayBound(allowedRpcs: readonly string[] = readRuntimeDeploymentRpcAllowlist()): boolean {
  const deployment = new Set(allowedRpcs);
  return PAYMENT_GATEWAY_RPCS.every((rpc) => deployment.has(rpc));
}

/** @deprecated Prefer isRuntimePaymentGatewayBound() — kept for explicit allowlist probes in tests. */
export function getRuntimePaymentGatewayAllowlist(): readonly string[] {
  return readRuntimeDeploymentRpcAllowlist();
}

export function resolvePaymentPurpose(
  facts: CustomerFinanceFacts,
  finalPayment: CustomerFinalPaymentRequest | null
): { purpose: PaymentGatewayPurpose | null; payableAmount: number | null } {
  if (
    finalPayment?.available &&
    finalPayment.settled !== true &&
    finalPayment.balance_due !== null &&
    finalPayment.balance_due > 0
  ) {
    return { purpose: "final_payment", payableAmount: finalPayment.balance_due };
  }

  if (facts.advance_covered !== true && facts.required_advance !== null && facts.required_advance > 0) {
    const covered = facts.covered_amount ?? 0;
    const payableAmount = Math.max(0, facts.required_advance - covered);
    if (payableAmount > 0) return { purpose: "advance", payableAmount };
  }

  if (facts.commercial_value !== null) {
    const covered = facts.covered_amount ?? facts.verified_payment_amount ?? 0;
    const balanceDue = Math.max(0, facts.commercial_value - covered);
    if (balanceDue > 0 && facts.advance_covered === true) {
      return { purpose: "balance", payableAmount: balanceDue };
    }
  }

  return { purpose: null, payableAmount: null };
}

/** Derives payable UI state strictly from server finance facts — no client-side amount math beyond display deltas. */
export function derivePayableState(
  facts: CustomerFinanceFacts | null,
  finalPayment: CustomerFinalPaymentRequest | null = null
): PayableState | null {
  if (!facts?.customer_safe_projection) return null;

  const commercialValue = facts.commercial_value;
  const requiredAdvance = facts.required_advance;
  const verifiedPaymentAmount = facts.verified_payment_amount;
  const coveredAmount = facts.covered_amount;
  const advanceCovered = facts.advance_covered === true;
  const { purpose, payableAmount } = resolvePaymentPurpose(facts, finalPayment);

  let balanceDue: number | null = null;
  if (commercialValue !== null && coveredAmount !== null) {
    balanceDue = Math.max(0, commercialValue - coveredAmount);
  } else if (commercialValue !== null && requiredAdvance !== null && verifiedPaymentAmount !== null) {
    balanceDue = Math.max(0, commercialValue - verifiedPaymentAmount);
  }

  return {
    orderId: facts.order_id,
    orderNumber: facts.order_number,
    commercialValue,
    requiredAdvance,
    verifiedPaymentAmount,
    coveredAmount,
    advanceCovered,
    balanceDue,
    financeStatus: facts.finance_status,
    piNumber: facts.pi_number,
    piStatus: facts.pi_status,
    piId: facts.pi_id,
    commercialVersionId: facts.commercial_version_id,
    paymentPurpose: purpose,
    payableAmount,
    finalPaymentStatus: finalPayment?.effective_status ?? null,
    finalPaymentInstructions: finalPayment?.payment_instructions ?? null,
  };
}

export function isTerminalPaymentStatus(status: string): "success" | "failure" | "pending" {
  const normalized = status.toLowerCase();
  const TERMINAL_SUCCESS = new Set(["succeeded", "success", "paid", "captured"]);
  const TERMINAL_FAILURE = new Set(["failed", "cancelled", "expired"]);
  if (TERMINAL_SUCCESS.has(normalized)) return "success";
  if (TERMINAL_FAILURE.has(normalized)) return "failure";
  return "pending";
}

export function resolvePaymentGatewayBoundary(
  facts: CustomerFinanceFacts | null,
  options: {
    isOnline?: boolean;
    finalPayment?: CustomerFinalPaymentRequest | null;
  } = {}
): PaymentGatewayBoundaryState {
  const gatewayBound = isRuntimePaymentGatewayBound();
  const payable = derivePayableState(facts, options.finalPayment ?? null);
  const isOnline = options.isOnline ?? true;

  if (!payable) {
    return {
      gatewayBound,
      payable: null,
      canInitiatePayment: false,
      blockedReason: "Finance facts are unavailable for this order.",
    };
  }

  if (!gatewayBound) {
    return {
      gatewayBound,
      payable,
      canInitiatePayment: false,
      blockedReason:
        "Payment gateway contracts are unavailable in this Buyer build. Payable amounts are shown from server facts only.",
    };
  }

  if (!isOnline) {
    return {
      gatewayBound,
      payable,
      canInitiatePayment: false,
      blockedReason: "You are offline. Payment initiation is disabled until your connection returns.",
    };
  }

  if (!payable.piId || !payable.commercialVersionId) {
    return {
      gatewayBound,
      payable,
      canInitiatePayment: false,
      blockedReason: "Commercial version or PI binding is not yet available for governed payment initiation.",
    };
  }

  if (!payable.paymentPurpose || payable.payableAmount === null || payable.payableAmount <= 0) {
    return {
      gatewayBound,
      payable,
      canInitiatePayment: false,
      blockedReason: "No server-authoritative payable balance is available for payment initiation.",
    };
  }

  return {
    gatewayBound,
    payable,
    canInitiatePayment: true,
    blockedReason: null,
  };
}
