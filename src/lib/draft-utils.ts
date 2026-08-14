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

  const moq = price.minimum_order_quantity ?? 1;
  const increment = price.order_increment ?? 1;
  const qty = issue.quantity;

  if (qty < moq) {
    return `Add ${moq - qty} more to reach MOQ ${moq}`;
  }

  if (increment > 0) {
    const remainder = moq != null ? (qty - moq) % increment : qty % increment;
    if (remainder !== 0) {
      const add = increment - remainder;
      return `Add ${add} more to match order increments of ${increment}`;
    }
  }

  return null;
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
