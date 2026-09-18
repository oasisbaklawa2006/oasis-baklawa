import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findDraftLineQuantity } from "./draft-utils";
import type { CustomerOrderDraft } from "@/types/database.types";

function draftWithLine(productId: string, quantity: number): CustomerOrderDraft {
  return {
    draft_id: "draft-1",
    company_id: "company-1",
    status: "active",
    readiness_status: "incomplete",
    readiness_issues: [],
    order_total: quantity * 100,
    is_checkout_ready: false,
    lines: [
      {
        line_id: "line-1",
        product_id: productId,
        quantity,
        unit_price_snapshot: 100,
        currency_snapshot: "INR",
        uom_snapshot: "kg",
        sku_snapshot: "SKU-1",
        product_name_snapshot: "Test Product",
        line_total: quantity * 100,
      },
    ],
  };
}

describe("findDraftLineQuantity — regression for the cart-overwrite bug", () => {
  it("returns the existing line's quantity when the product is already in the draft", () => {
    const draft = draftWithLine("product-a", 7);
    assert.equal(findDraftLineQuantity(draft, "product-a"), 7);
  });

  it("returns null when the product is not in the draft", () => {
    const draft = draftWithLine("product-a", 7);
    assert.equal(findDraftLineQuantity(draft, "product-b"), null);
  });

  it("returns null for a null draft (no active draft yet)", () => {
    assert.equal(findDraftLineQuantity(null, "product-a"), null);
  });

  it("regression: ProductDetailScreen must pre-fill from this rather than always defaulting to " +
    "MOQ, because add_customer_order_draft_line_v1 REPLACES the line's quantity on conflict -- " +
    "re-adding the same product with a fresh MOQ-default quantity silently overwrites (not adds " +
    "to) whatever quantity was already in the cart for that product", () => {
    const draft = draftWithLine("product-a", 50);
    const existingQuantity = findDraftLineQuantity(draft, "product-a");
    // The screen must use this value to initialize its quantity stepper,
    // not a hardcoded/MOQ default, or the next "Add to cart" tap for the
    // same product would submit a smaller quantity and silently erase the
    // buyer's existing 50 units.
    assert.equal(existingQuantity, 50);
    assert.notEqual(existingQuantity, null);
  });
});
