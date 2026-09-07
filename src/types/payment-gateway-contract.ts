/**
 * Governed customer payment gateway contracts — aligned to Core #255 production intent.
 * Buyer binds these only after Mission Control adds them to verify-contract-boundary.
 */
export const CORE_PAYMENT_GATEWAY_RPCS = [
  "create_customer_payment_intent_v1",
  "customer_payment_intent_status_v1",
] as const;

export type CorePaymentGatewayRpcName = (typeof CORE_PAYMENT_GATEWAY_RPCS)[number];

export const BUYER_BOUND_PAYMENT_GATEWAY_RPCS: readonly CorePaymentGatewayRpcName[] = [
  ...CORE_PAYMENT_GATEWAY_RPCS,
];

export interface CreateCustomerPaymentIntentInput {
  orderId: string;
  idempotencyKey: string;
}

export interface CreateCustomerPaymentIntentResult {
  payment_intent_id: string;
  gateway_checkout_url: string | null;
  amount: number;
  currency: string;
  status: string;
  already_applied: boolean;
}

export interface CustomerPaymentIntentStatusResult {
  payment_intent_id: string;
  status: string;
  verified_amount: number | null;
  failure_reason: string | null;
}
