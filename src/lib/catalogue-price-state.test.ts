import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cataloguePriceMessage, cataloguePriceState } from "./catalogue-price-state";
import { normalizeBuyerProductPrice } from "./customer-projections";

describe("Buyer #60 catalogue price state", () => {
  const priced = normalizeBuyerProductPrice({ product_id: "p", selling_price: 10, currency: "INR", uom: "kg", gst_rate: 5, tax_inclusive: false });
  it("never asks an approved buyer to sign in when pricing is missing", () => {
    assert.equal(cataloguePriceState(true, undefined), "pricing-unavailable");
    assert.equal(cataloguePriceMessage("pricing-unavailable"), "Buyer pricing unavailable for this product");
    assert.doesNotMatch(cataloguePriceMessage("pricing-unavailable") ?? "", /sign in/i);
  });
  it("keeps the sign-in prompt only for visitors and shows no message for priced items", () => {
    assert.equal(cataloguePriceState(false, undefined), "sign-in-required");
    assert.match(cataloguePriceMessage("sign-in-required") ?? "", /Sign in/);
    assert.ok(priced);
    assert.equal(cataloguePriceState(true, priced!), "priced");
    assert.equal(cataloguePriceMessage("priced"), null);
  });
  it("regression: a Core approved B2B price with NULL gst_rate is dropped (fail closed), not guessed", () => {
    assert.equal(normalizeBuyerProductPrice({ product_id: "p", selling_price: 1860, currency: "INR", uom: "kg", gst_rate: null, tax_inclusive: false }), null);
  });
});
