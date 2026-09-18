import type { ParsedRpcError } from "@/lib/rpc-errors";

export interface CheckoutSubmitErrorPresentation {
  message: string;
  concurrentPromotion: boolean;
}

const CONCURRENT_PROMOTION_MESSAGE =
  "This cart may have just been submitted -- by you on another device, or a teammate on your account. Check Orders for the new Sales Order before adding these items again.";

/**
 * Classifies a checkout-submit failure for display. Uses the structured
 * error code from parseRpcError, not string-matching on the message text
 * (which would be fragile and could misclassify an unrelated failure that
 * happens to mention "draft" in its message).
 *
 * DRAFT_NOT_FOUND from submit_customer_order_v1 is ambiguous by itself --
 * it fires both for a genuinely empty cart AND for a shared company draft
 * that a concurrent submission (another device, another team member, or a
 * retried request on this same device) already promoted to an order
 * moments earlier. Both are represented as the SAME code because that's
 * what the RPC returns; the surrounding call context (this is the
 * checkout-SUBMIT action, not add-to-cart) is what licenses treating it as
 * the concurrent-promotion case here specifically -- callers elsewhere in
 * the app that hit DRAFT_NOT_FOUND from a different action (e.g. add-to-
 * cart, where the draft genuinely doesn't exist yet) should NOT use this
 * classifier; they should show the RPC's own default message instead.
 */
export function classifyCheckoutSubmitError(parsed: ParsedRpcError): CheckoutSubmitErrorPresentation {
  if (parsed.code === "DRAFT_NOT_FOUND") {
    return { message: CONCURRENT_PROMOTION_MESSAGE, concurrentPromotion: true };
  }
  return { message: parsed.message, concurrentPromotion: false };
}
