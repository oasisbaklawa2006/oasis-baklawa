export type AdvanceLoadState =
  | { status: "loading" }
  | { status: "resolved"; amount: number }
  | { status: "failed"; message: string };

export function isCheckoutSubmitEnabled(params: {
  checkoutReady: boolean;
  /** True only after the buyer approves a server-authoritative tax-inclusive quote. */
  authoritativeQuoteApproved: boolean;
  orderValue: number;
  submitting: boolean;
  keyReady: boolean;
  idempotencyKey: string | null;
  keyPersisted: boolean;
  advanceState: AdvanceLoadState;
  commercialValidationPassed?: boolean;
  isOnline?: boolean;
}): boolean {
  if (params.authoritativeQuoteApproved !== true) {
    return false;
  }
  if (params.isOnline === false) {
    return false;
  }
  if (params.commercialValidationPassed === false) {
    return false;
  }
  if (!params.checkoutReady || params.orderValue <= 0 || params.submitting || !params.keyReady) {
    return false;
  }
  if (!params.idempotencyKey || !params.keyPersisted) {
    return false;
  }
  if (params.advanceState.status !== "resolved") {
    return false;
  }
  return true;
}

export function formatAdvanceDisplay(advanceState: AdvanceLoadState): string {
  if (advanceState.status === "loading") {
    return "Calculating…";
  }
  if (advanceState.status === "failed") {
    return "Unavailable";
  }
  return `₹${advanceState.amount.toLocaleString("en-IN")}`;
}

/** 
 * Fail closed on incomplete server-quoted lines before displaying or approving a
 * binding Sales Order. The checkout UI currently labels totals in INR and must
 * not silently treat foreign-currency lines as rupees. Core remains authoritative
 * for pricing, tax, totals, rounding, and order acceptance.
 */
export function hasValidQuoteLines(lines: unknown): lines is Record<string, unknown>[] {
  if (!Array.isArray(lines) || lines.length === 0) return false;
  const seen = new Set<string>();
  return lines.every((candidate) => {
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const line = candidate as Record<string, unknown>;
    const requiredText = ["product_id", "sku", "product_name", "uom"];
    if (!requiredText.every((key) => typeof line[key] === "string" && (line[key] as string).trim().length > 0)) {
      return false;
    }
    if (line.currency !== "INR" || line.tax_inclusive !== true && line.tax_inclusive !== false) return false;
    if (typeof line.quantity !== "number" || !Number.isFinite(line.quantity) || line.quantity <= 0) return false;
    if (typeof line.selling_price !== "number" || !Number.isFinite(line.selling_price) || line.selling_price <= 0) return false;
    if (typeof line.gst_rate !== "number" || !Number.isFinite(line.gst_rate) ||
        line.gst_rate < 0 || line.gst_rate > 100) return false;
    const productId = line.product_id as string;
    if (seen.has(productId)) return false;
    seen.add(productId);
    return true;
  });
}

export function hasValidQuoteAmounts(total: number, advance: number): boolean {
  return Number.isFinite(total) && total > 0 &&
    Number.isFinite(advance) && advance > 0 && advance <= total;
}
