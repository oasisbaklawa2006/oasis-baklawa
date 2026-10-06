import { supabase } from "@/lib/supabase";

export type PaymentProviderSession = {
  intentId: string;
  providerOrderId: string;
  checkoutUrl: string;
  amountMinor: number;
  currency: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function preparePaymentProviderSession(input: {
  orderId: string;
  piId: string;
  commercialVersionId: string;
  paymentPurpose: "advance" | "balance" | "final_payment";
  correlationId: string;
  idempotencyKey: string;
}): Promise<PaymentProviderSession> {
  const { data, error } = await supabase.functions.invoke("payment-provider-create-session", {
    body: {
      order_id: input.orderId,
      pi_id: input.piId,
      commercial_version_id: input.commercialVersionId,
      payment_purpose: input.paymentPurpose,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
    },
  });
  if (error) throw new Error("Online payment gateway is inactive or unavailable.");

  const row = record(data);
  const intentId = typeof row?.intent_id === "string" ? row.intent_id : null;
  const providerOrderId = typeof row?.provider_order_id === "string" ? row.provider_order_id : null;
  const checkoutUrl = httpsUrl(row?.checkout_url);
  const amountMinor = typeof row?.amount_minor === "number" ? row.amount_minor : null;
  const currency = typeof row?.currency === "string" ? row.currency : null;
  const pending = row?.canonical_status === "pending";
  const serverVerifiedOnly = row?.payment_success_requires_server_verification === true;

  if (
    !intentId ||
    !providerOrderId ||
    !checkoutUrl ||
    amountMinor === null ||
    amountMinor <= 0 ||
    !currency ||
    !pending ||
    !serverVerifiedOnly
  ) {
    throw new Error("Payment provider session did not return a governed pending payment.");
  }

  return { intentId, providerOrderId, checkoutUrl, amountMinor, currency };
}
