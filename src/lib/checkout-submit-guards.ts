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

/** Reject malformed Core quote payloads before Buyer checkout renders or approves them. */
export function hasValidQuoteLines(lines: unknown): lines is Record<string, unknown>[] {
  return Array.isArray(lines) && lines.length > 0 &&
    lines.every((line) => line !== null && typeof line === "object" && !Array.isArray(line));
}

export function hasValidQuoteAmounts(total: number, advance: number): boolean {
  return Number.isFinite(total) && total > 0 &&
    Number.isFinite(advance) && advance > 0 && advance <= total;
}
