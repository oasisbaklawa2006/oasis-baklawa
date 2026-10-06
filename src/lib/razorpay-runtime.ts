import { supabase } from "@/lib/supabase";
import {
  RAZORPAY_RUNTIME_ENABLED,
  resolveRazorpayRuntimeEnabled,
} from "@/lib/razorpay-runtime-flag";

export { RAZORPAY_RUNTIME_ENABLED, resolveRazorpayRuntimeEnabled };

export type RazorpayCheckoutOrder = {
  intentId: string;
  providerOrderId: string;
  keyId: string;
  amountPaise: number;
  currency: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function prepareRazorpayCheckoutOrder(input: {
  orderId: string;
  piId: string;
  commercialVersionId: string;
  paymentPurpose: "advance" | "balance" | "final_payment";
  correlationId: string;
  idempotencyKey: string;
}): Promise<RazorpayCheckoutOrder> {
  if (!RAZORPAY_RUNTIME_ENABLED) {
    throw new Error("Razorpay checkout is not enabled in this app build.");
  }

  const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
    body: {
      order_id: input.orderId,
      pi_id: input.piId,
      commercial_version_id: input.commercialVersionId,
      payment_purpose: input.paymentPurpose,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
    },
  });
  if (error) throw error;

  const row = record(data);
  const intentId = typeof row?.intent_id === "string" ? row.intent_id : null;
  const providerOrderId = typeof row?.provider_order_id === "string" ? row.provider_order_id : null;
  const keyId = typeof row?.razorpay_key_id === "string" ? row.razorpay_key_id : null;
  const amountPaise = typeof row?.amount_paise === "number" ? row.amount_paise : null;
  const currency = typeof row?.currency === "string" ? row.currency : null;
  const pending = row?.canonical_status === "pending";
  const backendVerifiedSuccessOnly = row?.payment_success_requires_verified_webhook === true;

  if (
    !intentId ||
    !providerOrderId ||
    !keyId ||
    amountPaise === null ||
    amountPaise <= 0 ||
    !currency ||
    !pending ||
    !backendVerifiedSuccessOnly
  ) {
    throw new Error("Razorpay order preparation did not return a governed pending payment.");
  }

  return {
    intentId,
    providerOrderId,
    keyId,
    amountPaise,
    currency,
  };
}
