import { callRpc } from "@/lib/rpc";
import type {
  CreateCustomerPaymentIntentInput,
  CreateCustomerPaymentIntentResult,
  CustomerPaymentIntentStatusResult,
} from "@/types/payment-gateway-contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCreateIntentResult(value: unknown): CreateCustomerPaymentIntentResult | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!isRecord(row)) return null;
  const paymentIntentId = typeof row.payment_intent_id === "string" ? row.payment_intent_id : null;
  const amount = typeof row.amount === "number" ? row.amount : null;
  const currency = typeof row.currency === "string" ? row.currency : null;
  const status = typeof row.status === "string" ? row.status : null;
  if (!paymentIntentId || amount === null || !currency || !status) return null;
  return {
    payment_intent_id: paymentIntentId,
    gateway_checkout_url: typeof row.gateway_checkout_url === "string" ? row.gateway_checkout_url : null,
    amount,
    currency,
    status,
    already_applied: row.already_applied === true,
  };
}

function normalizeIntentStatus(value: unknown): CustomerPaymentIntentStatusResult | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!isRecord(row)) return null;
  const paymentIntentId = typeof row.payment_intent_id === "string" ? row.payment_intent_id : null;
  const status = typeof row.status === "string" ? row.status : null;
  if (!paymentIntentId || !status) return null;
  return {
    payment_intent_id: paymentIntentId,
    status,
    verified_amount: typeof row.verified_amount === "number" ? row.verified_amount : null,
    failure_reason: typeof row.failure_reason === "string" ? row.failure_reason : null,
  };
}

export async function createCustomerPaymentIntent(
  input: CreateCustomerPaymentIntentInput
): Promise<CreateCustomerPaymentIntentResult> {
  const data = await callRpc("create_customer_payment_intent_v1", {
    p_order_id: input.orderId,
    p_idempotency_key: input.idempotencyKey,
  });
  const result = normalizeCreateIntentResult(data);
  if (!result) {
    throw new Error("Payment intent did not return a governed result. Please try again.");
  }
  return result;
}

export async function fetchCustomerPaymentIntentStatus(
  paymentIntentId: string
): Promise<CustomerPaymentIntentStatusResult> {
  const data = await callRpc("customer_payment_intent_status_v1", {
    p_payment_intent_id: paymentIntentId,
  });
  const result = normalizeIntentStatus(data);
  if (!result) {
    throw new Error("Payment status did not return a governed result. Please refresh.");
  }
  return result;
}
