import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CatalogueProduct } from "@/lib/api/catalogue";
import {
  applyGenieCandidateSelection,
  resolveGenieLines,
  type GenieParsedLine,
} from "./genie-product-resolution";

function parsedLine(rawName: string, quantity: number, lineId = "line-0"): GenieParsedLine {
  return { lineId, rawName, quantity, uom: "kg" };
}

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
  product("p4", "Premium KK 01 Selection", "PK-04"),
];

describe("genie product resolution", () => {
  it("resolves unambiguous alias matches and keeps an already-valid quantity unchanged", () => {
    const lines: GenieParsedLine[] = [parsedLine("20kg kaju katli", 10)];
    const result = resolveGenieLines(lines, catalogue);
    assert.equal(result.resolved.length, 1);
    assert.equal(result.resolved[0].product.product_id, "p1");
    assert.equal(result.resolved[0].normalizedQuantity, 10);
    assert.deepEqual(result.ambiguous, []);
    assert.deepEqual(result.unresolved, []);
  });

  it("never silently raises or rounds an AI-parsed quantity (T1.11)", () => {
    const below = resolveGenieLines([parsedLine("kaju katli", 3)], catalogue);
    assert.equal(below.resolved.length, 0);
    assert.match(below.unresolved[0].reason, /5/);
    const misaligned = resolveGenieLines([parsedLine("kaju katli", 7)], catalogue);
    assert.equal(misaligned.resolved.length, 0);
    assert.equal(misaligned.unresolved[0].quantity, 7);
  });

  it("does not assume a different unit than the one the customer asked for", () => {
    const result = resolveGenieLines([{ lineId: "u", rawName: "kaju katli", quantity: 10, uom: "tray" }], catalogue);
    assert.equal(result.resolved.length, 0);
    assert.match(result.unresolved[0].reason, /ordered in kg/);
    const generic = resolveGenieLines([{ lineId: "g", rawName: "kaju katli", quantity: 10, uom: "units" }], catalogue);
    assert.equal(generic.resolved.length, 1);
  });

  it("fails closed when buyer pricing or commercial data is missing", () => {
    const noPrice = { ...catalogue[0], price: undefined };
    const result = resolveGenieLines([parsedLine("kaju katli", 10)], [noPrice]);
    assert.equal(result.resolved.length, 0);
    assert.equal(result.unresolved.length, 1);
    assert.equal(result.unresolved[0].quantity, 10);
  });

  it("rejects invalid quantities on candidate selection and zero quantities, preserving the request", () => {
    const ambiguous = { lineId: "line-4", rawName: "badam baklawa", quantity: 7, uom: "kg", candidates: [catalogue[1]] };
    const selected = applyGenieCandidateSelection(ambiguous, catalogue[1]);
    assert.ok(!("product" in selected));
    assert.equal(selected.quantity, 7);
    const zero = resolveGenieLines([parsedLine("kaju katli", 0)], catalogue);
    assert.equal(zero.resolved.length, 0);
    assert.match(zero.unresolved[0].reason, /greater than zero/);
  });

  it("boosts exact hyphenated SKU matches above ambiguous name-only ties", () => {
    const lines: GenieParsedLine[] = [parsedLine("KK-01", 10, "line-sku")];
    const result = resolveGenieLines(lines, catalogue);
    assert.equal(result.resolved.length, 1);
    assert.equal(result.resolved[0].product.sku, "KK-01");
    assert.equal(result.resolved[0].product.product_id, "p1");
    assert.deepEqual(result.ambiguous, []);
  });

  it("returns ambiguity instead of inventing a product", () => {
    const lines: GenieParsedLine[] = [parsedLine("sweets", 10, "line-1")];
    const result = resolveGenieLines(lines, catalogue);
    assert.equal(result.resolved.length, 0);
    assert.equal(result.ambiguous.length, 1);
    assert.ok(result.ambiguous[0].candidates.length >= 2);
  });

  it("fails closed on unknown products", () => {
    const lines: GenieParsedLine[] = [parsedLine("mystery mithai", 10, "line-2")];
    const result = resolveGenieLines(lines, catalogue);
    assert.equal(result.unresolved.length, 1);
    assert.match(result.unresolved[0].reason, /No published catalogue match/);
  });

  it("applies candidate selection without inventing quantities", () => {
    const ambiguous = {
      lineId: "line-3",
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
