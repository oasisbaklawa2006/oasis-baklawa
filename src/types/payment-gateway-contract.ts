/**
 * Governed customer payment gateway contracts — Core #255 production authority
 * (oasis-supabase-core cd078c5256f7fc4fecffb86cd30df20a94f3efae, protected run #157).
 */
export const CORE_PAYMENT_GATEWAY_RPCS = [
  "create_payment_gateway_payable_intent_v1",
  "get_payment_gateway_payable_status_v1",
] as const;

export type CorePaymentGatewayRpcName = (typeof CORE_PAYMENT_GATEWAY_RPCS)[number];

export const BUYER_BOUND_PAYMENT_GATEWAY_RPCS: readonly CorePaymentGatewayRpcName[] = [
  ...CORE_PAYMENT_GATEWAY_RPCS,
];

export const DEFAULT_PAYMENT_PROVIDER_CODE = "razorpay" as const;

export type PaymentGatewayPurpose = "advance" | "balance" | "final_payment";

export interface CreatePaymentGatewayIntentInput {
  orderId: string;
  piId: string;
  commercialVersionId: string;
  paymentPurpose: PaymentGatewayPurpose;
  providerCode: string;
  correlationId: string;
  idempotencyKey: string;
}

export interface CreatePaymentGatewayIntentResult {
  intent_id: string;
  canonical_amount: number;
  currency: string;
  status: string;
  already_created: boolean;
}

export interface PaymentGatewayPayableStatus {
  intent_id: string;
  order_id: string;
  payment_purpose: PaymentGatewayPurpose | string;
  provider_code: string;
  canonical_amount: number;
  currency: string;
  status: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  order_payment_id: string | null;
  expires_at: string | null;
  buyer_status_only: boolean;
}

/** @deprecated Use CreatePaymentGatewayIntentInput */
export type CreateCustomerPaymentIntentInput = CreatePaymentGatewayIntentInput;
/** @deprecated Use CreatePaymentGatewayIntentResult */
export type CreateCustomerPaymentIntentResult = CreatePaymentGatewayIntentResult;
/** @deprecated Use PaymentGatewayPayableStatus */
export type CustomerPaymentIntentStatusResult = PaymentGatewayPayableStatus;
