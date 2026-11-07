import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAdvanceDisplay, hasValidQuoteAmounts, hasValidQuoteLines, isCheckoutSubmitEnabled } from "./checkout-submit-guards";

describe("authoritative checkout quote payload safety", () => {
  const validLine = {
    product_id: "7a1f",
    sku: "OAS-001",
    product_name: "Baklawa",
    quantity: 2,
    selling_price: 500,
    currency: "INR",
    uom: "kg",
    gst_rate: 5,
    tax_inclusive: false,
  };

  it("accepts complete governed INR lines but no incomplete or malformed quote lines", () => {
    assert.equal(hasValidQuoteLines([validLine]), true);
    assert.equal(hasValidQuoteLines([{ ...validLine, tax_inclusive: true }]), true);
    for (const line of [
      { ...validLine, selling_price: undefined },
      { ...validLine, gst_rate: undefined },
      { ...validLine, tax_inclusive: undefined },
      { ...validLine, currency: "USD" },
      { ...validLine, quantity: "2" },
      { ...validLine, quantity: 0 },
      { ...validLine, selling_price: Infinity },
      { ...validLine, gst_rate: 101 },
      { ...validLine, sku: "" },
      { ...validLine, uom: null },
      { ...validLine, product_name: "   " },
      { ...validLine, product_id: "" },
    ]) {
      assert.equal(hasValidQuoteLines([line]), false, JSON.stringify(line));
    }
    assert.equal(hasValidQuoteLines([validLine, { ...validLine }]), false, "duplicate product identity");
    assert.equal(hasValidQuoteLines([validLine, { ...validLine, product_id: "8b2e", currency: "USD" }]), false);
  });

  it("rejects an advance greater than the server-authoritative total", () => {
    assert.equal(hasValidQuoteAmounts(100, 120), false);
    assert.equal(hasValidQuoteAmounts(100, 100), true);
    assert.equal(hasValidQuoteAmounts(100, 30), true);
    assert.equal(hasValidQuoteAmounts(100, 0), false);
    assert.equal(hasValidQuoteAmounts(Number.NaN, 10), false);
    assert.equal(hasValidQuoteAmounts(100, Number.POSITIVE_INFINITY), false);
  });

  it("rejects null, primitive, and array entries in quote lines", () => {
    assert.equal(hasValidQuoteLines([validLine]), true);
    assert.equal(hasValidQuoteLines([]), false);
    assert.equal(hasValidQuoteLines([{ product_id: "sku" }, null]), false);
    assert.equal(hasValidQuoteLines([false]), false);
    assert.equal(hasValidQuoteLines([[]]), false);
    assert.equal(hasValidQuoteLines("not-an-array"), false);
  });
});

describe("checkout submit guards", () => {
  const base = {
    checkoutReady: true,
    authoritativeQuoteApproved: true,
    orderValue: 1000,
    submitting: false,
    keyReady: true,
    idempotencyKey: "uuid-key",
    keyPersisted: true,
    advanceState: { status: "resolved" as const, amount: 500 },
  };

  it("rejects checkout when buyer has not approved the authoritative tax-inclusive quote", () => {
    assert.equal(isCheckoutSubmitEnabled({ ...base, authoritativeQuoteApproved: false }), false);
    assert.equal(isCheckoutSubmitEnabled({ ...base, authoritativeQuoteApproved: true }), true);
  });

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

  it("blocks submit while offline", () => {
    assert.equal(isCheckoutSubmitEnabled({ ...base, isOnline: false }), false);
    assert.equal(isCheckoutSubmitEnabled({ ...base, isOnline: true }), true);
  });

  it("blocks submit while advance is loading or failed", () => {
    assert.equal(isCheckoutSubmitEnabled({ ...base, advanceState: { status: "loading" } }), false);
    assert.equal(
      isCheckoutSubmitEnabled({ ...base, advanceState: { status: "failed", message: "network" } }),
      false
    );
  });

  it("blocks submit when commercial validation fails", () => {
    assert.equal(isCheckoutSubmitEnabled({ ...base, commercialValidationPassed: false }), false);
    assert.equal(isCheckoutSubmitEnabled({ ...base, commercialValidationPassed: true }), true);
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
