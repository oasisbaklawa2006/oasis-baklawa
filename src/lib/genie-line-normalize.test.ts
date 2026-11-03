import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeGenieLine } from "./genie-line-normalize";

describe("normalizeGenieLine", () => {
  it("keeps an omitted unit absent instead of inventing 'units'", () => {
    assert.equal(normalizeGenieLine({ productName: "Kaju Katli", quantity: 10 })?.uom, "");
    assert.equal(normalizeGenieLine({ product_name: "Kaju Katli", quantity: "10", uom: null })?.uom, "");
  });
  it("keeps an explicit unit exactly as supplied, including 'units'", () => {
    assert.equal(normalizeGenieLine({ productName: "x", quantity: 2, uom: "units" })?.uom, "units");
    assert.equal(normalizeGenieLine({ productName: "x", quantity: 2, uom: "kg" })?.uom, "kg");
  });
  it("rejects a present but non-string unit instead of coercing it to an omitted unit", () => {
    for (const bad of [5, true, {}, ["kg"]]) assert.equal(normalizeGenieLine({ productName: "x", quantity: 2, uom: bad }), null);
    assert.equal(normalizeGenieLine({ productName: "x", quantity: 2, uom: undefined })?.uom, "");
    assert.equal(normalizeGenieLine({ productName: "x", quantity: 2, uom: null })?.uom, "");
  });
  it("rejects blank names and non-positive or non-numeric quantities", () => {
    for (const bad of [null, "x", { productName: " ", quantity: 1 }, { productName: "x", quantity: 0 }, { productName: "x", quantity: "abc" }]) {
      assert.equal(normalizeGenieLine(bad), null);
    }
  });
});
