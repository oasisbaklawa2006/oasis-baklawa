import type { CustomerOrderDraft } from "@/types/database.types";

/**
 * add_customer_order_draft_line_v1 is an UPSERT that REPLACES a product's quantity (Core contract).
 * Every UI that writes a draft line must therefore know the existing quantity first, so a buyer's
 * quantity is never silently overwritten. These helpers keep that decision pure and testable.
 */
export function existingQuantities(draft: CustomerOrderDraft | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of draft?.lines ?? []) out[line.product_id] = line.quantity;
  return out;
}

/** Stepper starting value: the quantity already in the cart, otherwise the governed default (MOQ). */
export function initialStepperQuantity(existing: number | undefined, defaultQuantity: number): number {
  return existing !== undefined && Number.isFinite(existing) && existing > 0 ? existing : defaultQuantity;
}

export function cartActionLabel(existing: number | undefined, busy: boolean): string {
  if (busy) return existing !== undefined ? "Updating…" : "Adding…";
  return existing !== undefined ? "Update cart" : "Add to cart";
}

export function cartActionNotice(productName: string, existing: number | undefined, quantity: number): string {
  return existing !== undefined && existing !== quantity
    ? `${productName} updated in cart (was ${existing}, now ${quantity})`
    : existing !== undefined
      ? `${productName} is already in your cart at ${existing}`
      : `${productName} added to cart`;
}

export interface BulkAddItem {
  productId: string;
  quantity: number;
}

export interface BulkAddPlan {
  toAdd: BulkAddItem[];
  /** Products already in the cart; left untouched so their quantities are preserved. */
  skippedExisting: { productId: string; existingQuantity: number }[];
}

/** Bulk "add again"/quick-add must never replace a quantity the buyer already chose. */
export function planBulkAdd(draft: CustomerOrderDraft | null, items: readonly BulkAddItem[]): BulkAddPlan {
  const existing = existingQuantities(draft);
  const plan: BulkAddPlan = { toAdd: [], skippedExisting: [] };
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.productId)) continue; // duplicate rows in the source: first one wins
    seen.add(item.productId);
    const current = existing[item.productId];
    if (current !== undefined) plan.skippedExisting.push({ productId: item.productId, existingQuantity: current });
    else plan.toAdd.push(item);
  }
  return plan;
}
