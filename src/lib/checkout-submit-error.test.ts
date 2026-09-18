import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyCheckoutSubmitError } from "./checkout-submit-error";
import type { ParsedRpcError } from "./rpc-errors";

describe("classifyCheckoutSubmitError", () => {
  it("DRAFT_NOT_FOUND: shows the concurrent-promotion message and sets concurrentPromotion true", () => {
    const parsed: ParsedRpcError = { code: "DRAFT_NOT_FOUND", message: "No active order draft was found. Add items from the catalogue." };
    const result = classifyCheckoutSubmitError(parsed);
    assert.equal(result.concurrentPromotion, true);
    assert.match(result.message, /may have just been submitted/i);
    assert.match(result.message, /Check Orders/i);
    // Must NOT surface the RPC's own generic message here -- it would
    // wrongly imply the cart was always empty.
    assert.doesNotMatch(result.message, /Add items from the catalogue/);
  });

  it("unrelated errors are never mislabeled as concurrent promotion -- regression for classifying " +
    "by structured code, not string-matching on message text", () => {
    const unrelatedCodes: ParsedRpcError[] = [
      { code: "DRAFT_NOT_READY", message: "Your cart is not ready for checkout. Review quantity rules below." },
      { code: "PRODUCT_UNAVAILABLE", message: "This product is not available for your account right now." },
      { code: "AUTH_REQUIRED", message: "Please log in again." },
      { code: "UNKNOWN", message: "Something went wrong. Please try again." },
    ];
    for (const parsed of unrelatedCodes) {
      const result = classifyCheckoutSubmitError(parsed);
      assert.equal(result.concurrentPromotion, false, `"${parsed.code}" must not be classified as concurrent promotion`);
      assert.equal(result.message, parsed.message, `"${parsed.code}" must pass through its own message unchanged`);
    }
  });
});
