import { quantityCompletionHint } from "@/lib/buyer-commercial-validation";
import type {
  BuyerProductPrice,
  CustomerOrderDraft,
  CustomerOrderDraftLine,
  CustomerOrderDraftRow,
  DraftReadinessIssue,
} from "@/types/database.types";

export function aggregateDraftRows(rows: CustomerOrderDraftRow[]): CustomerOrderDraft | null {
  if (rows.length === 0) return null;

  const head = rows[0];
  const lines: CustomerOrderDraftLine[] = rows
    .filter((row) => row.line_id && row.product_id && row.quantity != null && row.unit_price_snapshot != null)
    .map((row) => ({
      line_id: row.line_id!,
      product_id: row.product_id!,
      quantity: Number(row.quantity),
      unit_price_snapshot: Number(row.unit_price_snapshot),
      currency_snapshot: row.currency_snapshot ?? "INR",
      uom_snapshot: row.uom_snapshot,
      sku_snapshot: row.sku_snapshot,
      product_name_snapshot: row.product_name_snapshot,
      line_total: Number(row.quantity) * Number(row.unit_price_snapshot),
    }));

  const order_total = lines.reduce((sum, line) => sum + line.line_total, 0);

  return {
    draft_id: head.draft_id,
    company_id: head.company_id,
    status: head.status,
    readiness_status: head.readiness_status,
    readiness_issues: head.readiness_issues ?? [],
    lines,
    order_total,
    is_checkout_ready: head.readiness_status === "ready" && lines.length > 0,
  };
}

export function issueMessage(issue: DraftReadinessIssue, price?: BuyerProductPrice): string {
  switch (issue.code) {
    case "EMPTY_DRAFT":
      return "Add products to your cart before checkout.";
    case "PRODUCT_UNAVAILABLE":
      return "A product in your cart is no longer available.";
    case "QUANTITY_RULE_VIOLATION":
      return cartonHint(issue, price) ?? "Quantity does not satisfy MOQ or carton rules.";
    case "DRAFT_NOT_ACTIVE":
      return "This draft has already been submitted and cannot be changed.";
    default:
      return "Cart validation issue. Review quantities and try again.";
  }
}

export function cartonHint(issue: DraftReadinessIssue, price?: BuyerProductPrice): string | null {
  if (!price || issue.quantity == null) return null;

  const moq = price.minimum_order_quantity;
  const increment = price.order_increment;
  if (moq === null || moq <= 0 || increment === null || increment <= 0) {
    return null;
  }

  return quantityCompletionHint(moq, increment, issue.quantity);
}

export function nextValidQuantity(current: number, moq: number, increment: number, delta: number): number {
  const step = increment > 0 ? increment : 1;
  const base = moq > 0 ? moq : step;
  const candidate = current + delta * step;
  if (candidate < base) return base;
  if (increment > 0 && moq > 0) {
    const steps = Math.round((candidate - moq) / increment);
    return moq + steps * increment;
  }
  if (increment > 0) {
    return Math.max(base, Math.round(candidate / increment) * increment);
  }
  return candidate;
}

/**
 * Finds the existing draft-cart quantity for a product, if any.
 *
 * add_customer_order_draft_line_v1 (Core) is an UPSERT that REPLACES the
 * line's quantity (`ON CONFLICT ... DO UPDATE SET quantity =
 * excluded.quantity`), not an increment -- by design, matching how the
 * quantity stepper is meant to represent the final total for that product,
 * not a delta to add. A screen that re-initializes its quantity input from
 * scratch (e.g. a hardcoded MOQ default) every time it's opened, rather
 * than from this, will silently overwrite -- not add to -- whatever
 * quantity is already in the draft for that product the next time the
 * buyer submits. ProductDetailScreen uses this to pre-fill its stepper
 * from the existing line and label the action "Update cart" instead of
 * "Add to cart" when one exists.
 */
export function findDraftLineQuantity(
  draft: CustomerOrderDraft | null,
  productId: string
): number | null {
  const line = draft?.lines.find((l) => l.product_id === productId);
  return line ? line.quantity : null;
}
