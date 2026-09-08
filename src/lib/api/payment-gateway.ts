import { callRpc } from "@/lib/rpc";
import type {
  CreatePaymentGatewayIntentInput,
  CreatePaymentGatewayIntentResult,
  PaymentGatewayPayableStatus,
  PaymentGatewayPurpose,
} from "@/types/payment-gateway-contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCreateIntentRow(value: unknown): CreatePaymentGatewayIntentResult | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!isRecord(row)) return null;
  const intentId = typeof row.intent_id === "string" ? row.intent_id : null;
  const canonicalAmount = typeof row.canonical_amount === "number" ? row.canonical_amount : null;
  const currency = typeof row.currency === "string" ? row.currency : null;
  const status = typeof row.status === "string" ? row.status : null;
  if (!intentId || canonicalAmount === null || !currency || !status) return null;
  return {
    intent_id: intentId,
    canonical_amount: canonicalAmount,
    currency,
    status,
    already_created: row.already_created === true,
  };
}

function normalizePayableStatus(value: unknown): PaymentGatewayPayableStatus | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!isRecord(row)) return null;
  const intentId = typeof row.intent_id === "string" ? row.intent_id : null;
  const orderId = typeof row.order_id === "string" ? row.order_id : null;
  const paymentPurpose = typeof row.payment_purpose === "string" ? row.payment_purpose : null;
  const providerCode = typeof row.provider_code === "string" ? row.provider_code : null;
  const canonicalAmount = typeof row.canonical_amount === "number" ? row.canonical_amount : null;
  const currency = typeof row.currency === "string" ? row.currency : null;
  const status = typeof row.status === "string" ? row.status : null;
  if (!intentId || !orderId || !paymentPurpose || !providerCode || canonicalAmount === null || !currency || !status) {
    return null;
  }
  return {
    intent_id: intentId,
    order_id: orderId,
    payment_purpose: paymentPurpose as PaymentGatewayPurpose,
    provider_code: providerCode,
    canonical_amount: canonicalAmount,
    currency,
    status,
    provider_order_id: typeof row.provider_order_id === "string" ? row.provider_order_id : null,
    provider_payment_id: typeof row.provider_payment_id === "string" ? row.provider_payment_id : null,
    order_payment_id: typeof row.order_payment_id === "string" ? row.order_payment_id : null,
    expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
    buyer_status_only: row.buyer_status_only === true,
  };
}

export async function createPaymentGatewayPayableIntent(
  input: CreatePaymentGatewayIntentInput
): Promise<CreatePaymentGatewayIntentResult> {
  const data = await callRpc("create_payment_gateway_payable_intent_v1", {
    p_order_id: input.orderId,
    p_pi_id: input.piId,
    p_commercial_version_id: input.commercialVersionId,
    p_payment_purpose: input.paymentPurpose,
    p_provider_code: input.providerCode,
    p_correlation_id: input.correlationId,
    p_idempotency_key: input.idempotencyKey,
  });
  const result = normalizeCreateIntentRow(data);
  if (!result) {
    throw new Error("Payment gateway intent did not return a governed result. Please try again.");
  }
  return result;
}

export async function fetchPaymentGatewayPayableStatus(
  intentId: string
): Promise<PaymentGatewayPayableStatus> {
  const data = await callRpc("get_payment_gateway_payable_status_v1", {
    p_intent_id: intentId,
  });
  const result = normalizePayableStatus(data);
  if (!result) {
    throw new Error("Payment gateway status did not return a governed result. Please refresh.");
  }
  return result;
}

/** @deprecated Use createPaymentGatewayPayableIntent */
export const createCustomerPaymentIntent = createPaymentGatewayPayableIntent;
/** @deprecated Use fetchPaymentGatewayPayableStatus */
export const fetchCustomerPaymentIntentStatus = fetchPaymentGatewayPayableStatus;
