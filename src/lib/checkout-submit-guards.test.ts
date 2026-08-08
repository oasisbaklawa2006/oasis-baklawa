import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAdvanceDisplay, isCheckoutSubmitEnabled } from "./checkout-submit-guards";

describe("checkout submit guards", () => {
  const base = {
    checkoutReady: true,
    orderValue: 1000,
    submitting: false,
    keyReady: true,
    idempotencyKey: "uuid-key",
    keyPersisted: true,
    advanceState: { status: "resolved" as const, amount: 500 },
  };

  it("blocks submit when idempotency key is not durably persisted", () => {
    assert.equal(
      isCheckoutSubmitEnabled({
        ...base,
        keyPersisted: false,
        idempotencyKey: null,
      }),
      false
    );
  });

  it("blocks submit while advance is loading or failed", () => {
    assert.equal(isCheckoutSubmitEnabled({ ...base, advanceState: { status: "loading" } }), false);
    assert.equal(
      isCheckoutSubmitEnabled({ ...base, advanceState: { status: "failed", message: "network" } }),
      false
    );
  });

  it("allows submit for resolved zero advance", () => {
    assert.equal(
      isCheckoutSubmitEnabled({
        ...base,
        orderValue: 100,
        advanceState: { status: "resolved", amount: 0 },
      }),
      true
    );
  });

  it("does not show failed advance as zero currency", () => {
    assert.equal(formatAdvanceDisplay({ status: "failed", message: "x" }), "Unavailable");
    assert.equal(formatAdvanceDisplay({ status: "loading" }), "Calculating…");
    assert.equal(formatAdvanceDisplay({ status: "resolved", amount: 0 }), "₹0");
  });
});
