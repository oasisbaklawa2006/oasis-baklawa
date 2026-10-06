import RazorpayCheckout from "react-native-razorpay";
import type { RazorpayCheckoutOrder } from "@/lib/razorpay-runtime";

export interface NativeRazorpayResult {
  providerPaymentId: string | null;
  providerOrderId: string | null;
  providerSignature: string | null;
}

function value(record: unknown, key: string): string | null {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const raw = (record as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function openNativeRazorpayCheckout(
  order: RazorpayCheckoutOrder,
  orderNumber?: string
): Promise<NativeRazorpayResult> {
  const result = await RazorpayCheckout.open({
    key: order.keyId,
    order_id: order.providerOrderId,
    amount: order.amountPaise,
    currency: order.currency,
    name: "Oasis Baklawa",
    description: orderNumber
      ? `Payment for ${orderNumber}`
      : "Oasis Baklawa B2B order payment",
  });

  return {
    providerPaymentId: value(result, "razorpay_payment_id"),
    providerOrderId: value(result, "razorpay_order_id"),
    providerSignature: value(result, "razorpay_signature"),
  };
}
