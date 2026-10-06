export function resolveRazorpayRuntimeEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export const RAZORPAY_RUNTIME_ENABLED = resolveRazorpayRuntimeEnabled(
  process.env.EXPO_PUBLIC_RAZORPAY_CHECKOUT_ENABLED
);
