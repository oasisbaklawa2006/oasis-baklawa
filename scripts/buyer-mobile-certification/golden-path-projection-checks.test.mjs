import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allRowsHaveCustomerSafeKeysOnly,
  BUYER_PRICE_FIELDS,
  PUBLISHED_PRODUCT_FIELDS,
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

  it("accepts lead_time_days on published catalogue rows", () => {
    assert.equal(
      allRowsHaveCustomerSafeKeysOnly(
        [
          {
            product_id: "p-1",
            sku: "SKU-1",
            product_name: "Katli",
            created_at: "2026-09-01T00:00:00Z",
            lead_time_days: 7,
          },
        ],
        PUBLISHED_PRODUCT_FIELDS
      ),
      true
    );
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

  it("fail-closes when a later row leaks publication flags after safe leading rows", () => {
    const safeProduct = {
      product_id: "p-1",
      sku: "SKU-1",
      product_name: "Katli",
      created_at: "2026-09-01T00:00:00Z",
    };
    const safePrice = {
      product_id: "p-1",
      selling_price: 500,
      currency: "INR",
      uom: "kg",
      gst_rate: 5,
      tax_inclusive: true,
    };

    assert.equal(
      allRowsHaveCustomerSafeKeysOnly(
        [safeProduct, { ...safeProduct, product_id: "p-2", sku: "SKU-2", is_published: true }],
        PUBLISHED_PRODUCT_FIELDS
      ),
      false
    );
    assert.equal(
      allRowsHaveCustomerSafeKeysOnly(
        [safePrice, { ...safePrice, product_id: "p-2", publication_state: "published" }],
        BUYER_PRICE_FIELDS
      ),
      false
    );
    assert.equal(
      allRowsHaveCustomerSafeKeysOnly(
        [safePrice, { ...safePrice, product_id: "p-2", is_published: false }],
        BUYER_PRICE_FIELDS
      ),
      false
    );
  });
});
