import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cartActionLabel, cartActionNotice, existingQuantities, initialStepperQuantity, planBulkAdd } from "./draft-add-guard";
import type { CustomerOrderDraft } from "../types/database.types";

const draft = { lines: [{ line_id: "l1", product_id: "a", quantity: 30 }] } as unknown as CustomerOrderDraft;

describe("draft add/update semantics (upsert replaces quantity)", () => {
  it("reads existing quantities and seeds steppers from the cart, not MOQ", () => {
    assert.deepEqual(existingQuantities(draft), { a: 30 });
    assert.deepEqual(existingQuantities(null), {});
    assert.equal(initialStepperQuantity(30, 5), 30);
    assert.equal(initialStepperQuantity(undefined, 5), 5);
    assert.equal(initialStepperQuantity(0, 5), 5);
  });
  it("labels the action unambiguously", () => {
    assert.equal(cartActionLabel(undefined, false), "Add to cart");
    assert.equal(cartActionLabel(30, false), "Update cart");
    assert.equal(cartActionLabel(30, true), "Updating…");
    assert.equal(cartActionLabel(undefined, true), "Adding…");
  });
  it("reports what actually happened to the quantity", () => {
    assert.match(cartActionNotice("X", undefined, 5), /added to cart/);
    assert.match(cartActionNotice("X", 30, 35), /was 30, now 35/);
    assert.match(cartActionNotice("X", 30, 30), /already in your cart at 30/);
  });
  it("bulk add never overwrites an existing line and ignores duplicate source rows", () => {
    const plan = planBulkAdd(draft, [{ productId: "a", quantity: 5 }, { productId: "b", quantity: 7 }, { productId: "b", quantity: 99 }]);
    assert.deepEqual(plan.toAdd, [{ productId: "b", quantity: 7 }]);
    assert.deepEqual(plan.skippedExisting, [{ productId: "a", existingQuantity: 30 }]);
    assert.deepEqual(planBulkAdd(null, [{ productId: "a", quantity: 5 }]).toAdd, [{ productId: "a", quantity: 5 }]);
  });
});
