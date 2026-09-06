import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allRowsHaveCustomerSafeKeysOnly,
  rowHasCustomerSafeKeysOnly,
} from "./product-publication-allowlist.mjs";

const PRODUCT_FIELDS = new Set([
  "product_id",
  "sku",
  "product_name",
  "created_at",
]);

const PRICE_FIELDS = new Set([
  "product_id",
  "selling_price",
  "currency",
  "uom",
  "gst_rate",
  "tax_inclusive",
]);

describe("golden-path projection checks", () => {
  it("accepts every allowlisted row and rejects restricted keys on any row", () => {
    assert.equal(
      allRowsHaveCustomerSafeKeysOnly(
        [
          { product_id: "p-1", sku: "SKU-1", product_name: "Katli", created_at: "2026-09-01T00:00:00Z" },
          { product_id: "p-2", sku: "SKU-2", product_name: "Baklawa", created_at: "2026-09-02T00:00:00Z" },
        ],
        PRODUCT_FIELDS
      ),
      true
    );
    assert.equal(
      allRowsHaveCustomerSafeKeysOnly(
        [
          { product_id: "p-1", sku: "SKU-1", product_name: "Katli", created_at: "2026-09-01T00:00:00Z" },
          { product_id: "p-2", sku: "SKU-2", product_name: "Baklawa", created_at: "2026-09-02T00:00:00Z", publication_state: "draft" },
        ],
        PRODUCT_FIELDS
      ),
      false
    );
    assert.equal(allRowsHaveCustomerSafeKeysOnly([null], PRODUCT_FIELDS), false);
    assert.equal(allRowsHaveCustomerSafeKeysOnly(["not-an-object"], PRODUCT_FIELDS), false);
  });

  it("rejects publication_state and is_published on buyer-price rows", () => {
    const safePrice = {
      product_id: "p-1",
      selling_price: 500,
      currency: "INR",
      uom: "kg",
      gst_rate: 5,
      tax_inclusive: true,
    };
    assert.equal(rowHasCustomerSafeKeysOnly(safePrice, PRICE_FIELDS), true);
    assert.equal(rowHasCustomerSafeKeysOnly({ ...safePrice, publication_state: "published" }, PRICE_FIELDS), false);
    assert.equal(rowHasCustomerSafeKeysOnly({ ...safePrice, is_published: true }, PRICE_FIELDS), false);
    assert.equal(rowHasCustomerSafeKeysOnly({ ...safePrice, internal_margin_percent: 12 }, PRICE_FIELDS), false);
  });
});
