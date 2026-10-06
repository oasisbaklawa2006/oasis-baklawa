import RazorpayCheckout from "react-native-razorpay";
import {
  RAZORPAY_RUNTIME_ENABLED,
  type RazorpayCheckoutOrder,
} from "@/lib/razorpay-runtime";

export async function openRazorpayNativeCheckout(order: RazorpayCheckoutOrder): Promise<void> {
  if (!RAZORPAY_RUNTIME_ENABLED) {
    throw new Error("Razorpay checkout is not enabled in this app build.");
  }

  const result = await RazorpayCheckout.open({
    key: order.keyId,
    amount: order.amountPaise,
    currency: order.currency,
    name: "Oasis Baklawa",
    description: "B2B order payment",
    order_id: order.providerOrderId,
  });

  // The SDK callback proves only that the local provider flow returned. It is
  // never payment truth. Canonical success is granted only after Core records
  // a signed provider webhook and get_payment_gateway_payable_status_v1
  // reports a terminal successful settlement.
  if (
    result.razorpay_order_id !== order.providerOrderId ||
    typeof result.razorpay_payment_id !== "string" ||
    !result.razorpay_payment_id.trim()
  ) {
    throw new Error("Razorpay checkout returned an unexpected payment session.");
  }
}
