export type AdvanceLoadState =
  | { status: "loading" }
  | { status: "resolved"; amount: number }
  | { status: "failed"; message: string };

export function isCheckoutSubmitEnabled(params: {
  checkoutReady: boolean;
  orderValue: number;
  submitting: boolean;
  keyReady: boolean;
  idempotencyKey: string | null;
  keyPersisted: boolean;
  advanceState: AdvanceLoadState;
}): boolean {
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
