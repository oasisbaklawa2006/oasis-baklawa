import type { BuyerProductPrice } from "@/types/database.types";

/**
 * Buyer #60: an already-approved buyer whose product has no usable price was told to
 * "Sign in as an approved buyer". Root cause (read-only census, 30 Oct 2026): Core projects approved
 * B2B price rows whose gst_rate is NULL; normalizeBuyerProductPrice correctly drops them (checkout also
 * requires GST), so the product has no price client-side. The message must be truthful and keep ordering
 * closed; it must not ask the buyer to sign in again.
 */
export type CataloguePriceState = "priced" | "sign-in-required" | "pricing-unavailable";

export function cataloguePriceState(isApprovedBuyer: boolean, price: BuyerProductPrice | undefined): CataloguePriceState {
  if (!isApprovedBuyer) return "sign-in-required";
  return price ? "priced" : "pricing-unavailable";
}

export function cataloguePriceMessage(state: CataloguePriceState): string | null {
  switch (state) {
    case "sign-in-required":
      return "Sign in as an approved buyer for pricing";
    case "pricing-unavailable":
      return "Buyer pricing unavailable for this product";
    default:
      return null;
  }
}
