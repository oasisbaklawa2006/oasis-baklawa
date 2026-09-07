import type { CustomerFinanceFacts } from "@/types/database.types";

/** Core gateway RPCs — Buyer binds these only when Mission Control adds them to verify-contract-boundary. */
export const PAYMENT_GATEWAY_RPCS = [
  "create_customer_payment_intent_v1",
  "customer_payment_intent_status_v1",
] as const;

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
}

export interface PaymentGatewayBoundaryState {
  gatewayBound: boolean;
  payable: PayableState | null;
  canInitiatePayment: boolean;
  blockedReason: string | null;
}

export function isPaymentGatewayBound(allowedRpcs: readonly string[]): boolean {
  return PAYMENT_GATEWAY_RPCS.every((rpc) => allowedRpcs.includes(rpc));
}

/** Derives payable UI state strictly from server finance facts — no client-side amount math beyond display deltas. */
export function derivePayableState(facts: CustomerFinanceFacts | null): PayableState | null {
  if (!facts?.customer_safe_projection) return null;

  const commercialValue = facts.commercial_value;
  const requiredAdvance = facts.required_advance;
  const verifiedPaymentAmount = facts.verified_payment_amount;
  const coveredAmount = facts.covered_amount;
  const advanceCovered = facts.advance_covered === true;

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
  };
}

export function resolvePaymentGatewayBoundary(
  facts: CustomerFinanceFacts | null,
  allowedRpcs: readonly string[],
  options: { isOnline?: boolean } = {}
): PaymentGatewayBoundaryState {
  const gatewayBound = isPaymentGatewayBound(allowedRpcs);
  const payable = derivePayableState(facts);
  const isOnline = options.isOnline ?? true;

  if (!payable) {
    return {
      gatewayBound,
      payable: null,
      canInitiatePayment: false,
      blockedReason: "Finance facts are unavailable for this order.",
    };
  }

  if (payable.advanceCovered) {
    return {
      gatewayBound,
      payable,
      canInitiatePayment: false,
      blockedReason: "Advance is already covered according to server finance facts.",
    };
  }

  if (!gatewayBound) {
    return {
      gatewayBound,
      payable,
      canInitiatePayment: false,
      blockedReason:
        "Payment gateway intent/status contracts are not yet bound in Buyer. Payable amounts are shown from server facts only.",
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

  if (payable.requiredAdvance === null || payable.requiredAdvance <= 0) {
    return {
      gatewayBound,
      payable,
      canInitiatePayment: false,
      blockedReason: "No server-authoritative advance amount is available for payment initiation.",
    };
  }

  return {
    gatewayBound,
    payable,
    canInitiatePayment: true,
    blockedReason: null,
  };
}
