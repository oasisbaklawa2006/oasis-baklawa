import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CatalogueProduct } from "@/lib/api/catalogue";
import {
  applyGenieCandidateSelection,
  resolveGenieLines,
  type GenieParsedLine,
} from "./genie-product-resolution";

const basePrice = {
  product_id: "p1",
  selling_price: 100,
  currency: "INR",
  uom: "kg",
  gst_rate: 5,
  tax_inclusive: true,
  applied_discount_percent: null,
  minimum_order_quantity: 5,
  minimum_order_uom: "kg",
  order_increment: 5,
  order_increment_uom: "kg",
  valid_from: null,
  valid_until: null,
};

function product(id: string, name: string, sku: string): CatalogueProduct {
  return {
    product_id: id,
    sku,
    product_name: name,
    short_description: null,
    long_description: null,
    category: "Sweets",
    subcategory: null,
    hero_image_url: null,
    pack_size: "1 kg",
    storage_type: null,
    shelf_life: null,
    shelf_life_days: null,
    lead_time_days: null,
    dietary_tags: null,
    allergen_warnings: null,
    primary_uom: "kg",
    created_at: "2026-01-01T00:00:00Z",
    price: { ...basePrice, product_id: id },
  };
}

const catalogue = [
  product("p1", "Kaju Katli", "KK-01"),
  product("p2", "Almond Baklawa", "AB-02"),
  product("p3", "Pista Roll", "PR-03"),
];

describe("genie product resolution", () => {
  it("resolves unambiguous alias matches and normalizes quantity to MOQ/increment", () => {
    const lines: GenieParsedLine[] = [{ rawName: "20kg kaju katli", quantity: 7, uom: "kg" }];
    const result = resolveGenieLines(lines, catalogue);
    assert.equal(result.resolved.length, 1);
    assert.equal(result.resolved[0].product.product_id, "p1");
    assert.equal(result.resolved[0].normalizedQuantity, 10);
    assert.deepEqual(result.ambiguous, []);
    assert.deepEqual(result.unresolved, []);
  });

  it("returns ambiguity instead of inventing a product", () => {
    const lines: GenieParsedLine[] = [{ rawName: "sweets", quantity: 10, uom: "kg" }];
    const result = resolveGenieLines(lines, catalogue);
    assert.equal(result.resolved.length, 0);
    assert.equal(result.ambiguous.length, 1);
    assert.ok(result.ambiguous[0].candidates.length >= 2);
  });

  it("fails closed on unknown products", () => {
    const lines: GenieParsedLine[] = [{ rawName: "mystery mithai", quantity: 10, uom: "kg" }];
    const result = resolveGenieLines(lines, catalogue);
    assert.equal(result.unresolved.length, 1);
    assert.match(result.unresolved[0].reason, /No published catalogue match/);
  });

  it("applies candidate selection without inventing quantities", () => {
    const ambiguous = {
      rawName: "badam baklawa",
      quantity: 5,
      uom: "kg",
      candidates: [catalogue[1]],
    };
    const selected = applyGenieCandidateSelection(ambiguous, catalogue[1]);
    assert.ok("product" in selected);
    if ("product" in selected) {
      assert.equal(selected.product.product_id, "p2");
      assert.equal(selected.normalizedQuantity, 5);
    }
  });
});
