import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeBuyerProductPrice,
  normalizePublishedProduct,
} from "./customer-projections";

const ROOT = join(__dirname, "..");

const PUBLISHED_PRODUCT_FIELDS = [
  "product_id",
  "sku",
  "product_name",
  "short_description",
  "long_description",
  "category",
  "subcategory",
  "hero_image_url",
  "pack_size",
  "storage_type",
  "shelf_life",
  "shelf_life_days",
  "dietary_tags",
  "allergen_warnings",
  "primary_uom",
  "created_at",
] as const;

const BUYER_PRICE_FIELDS = [
  "product_id",
  "selling_price",
  "currency",
  "uom",
  "gst_rate",
  "tax_inclusive",
  "applied_discount_percent",
  "minimum_order_quantity",
  "minimum_order_uom",
  "order_increment",
  "order_increment_uom",
  "valid_from",
  "valid_until",
] as const;

const PRODUCT_READ_SURFACES = [
  {
    surface: "catalogue browse/search",
    file: "screens/CatalogueScreen.tsx",
    authority: "fetchCatalogue",
    rpcs: ["published_products_v1", "buyer_product_prices_v1"],
  },
  {
    surface: "product detail",
    file: "screens/ProductDetailScreen.tsx",
    authority: "fetchCatalogue",
    rpcs: ["published_products_v1", "buyer_product_prices_v1"],
  },
  {
    surface: "dashboard best sellers",
    file: "screens/DashboardScreen.tsx",
    authority: "fetchPublishedProducts",
    rpcs: ["published_products_v1"],
  },
  {
    surface: "quick order / reorder",
    file: "screens/QuickOrderScreen.tsx",
    authority: "fetchCatalogue",
    rpcs: ["published_products_v1", "buyer_product_prices_v1"],
  },
  {
    surface: "cart MOQ and pricing",
    file: "screens/CartScreen.tsx",
    authority: "fetchBuyerProductPrices",
    rpcs: ["buyer_product_prices_v1"],
  },
] as const;

function walkSource(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walkSource(path));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(path);
  }
  return files;
}

describe("Point56 product publication census", () => {
  it("binds every Buyer product read surface to governed publication authority", () => {
    for (const row of PRODUCT_READ_SURFACES) {
      const source = readFileSync(join(ROOT, row.file), "utf8");
      assert.match(source, new RegExp(row.authority), `${row.surface} must use ${row.authority}`);
      assert.doesNotMatch(source, /\.from\(\s*['"]products['"]\s*\)/, `${row.surface} must not read products table`);
    }
  });

  it("routes catalogue API through published_products_v1 and buyer_product_prices_v1 only", () => {
    const source = readFileSync(join(ROOT, "lib/api/catalogue.ts"), "utf8");
    assert.match(source, /published_products_v1/);
    assert.match(source, /buyer_product_prices_v1/);
    assert.match(source, /normalizePublishedProducts/);
    assert.match(source, /normalizeBuyerProductPrices/);
    assert.doesNotMatch(source, /\.from\(/);
  });

  it("does not expose direct products table reads anywhere in src", () => {
    const hits: string[] = [];
    for (const file of walkSource(ROOT)) {
      if (file.endsWith("product-publication.test.ts")) continue;
      const source = readFileSync(file, "utf8");
      if (/\.from\(\s*['"]products['"]\s*\)/.test(source)) hits.push(file);
    }
    assert.deepEqual(hits, []);
  });

  it("fail-closes unpublished or malformed catalogue rows at the projection boundary", () => {
    assert.equal(normalizePublishedProduct({ product_id: "p-1", sku: "SKU-1" }), null);
    assert.deepEqual(
      normalizePublishedProduct({
        product_id: "p-1",
        sku: "SKU-1",
        product_name: "Kaju Katli",
        created_at: "2026-09-01T00:00:00Z",
        internal_cost: 120,
        publication_state: "draft",
        supplier_id: "supplier-internal",
      }),
      {
        product_id: "p-1",
        sku: "SKU-1",
        product_name: "Kaju Katli",
        short_description: null,
        long_description: null,
        category: null,
        subcategory: null,
        hero_image_url: null,
        pack_size: null,
        storage_type: null,
        shelf_life: null,
        shelf_life_days: null,
        dietary_tags: null,
        allergen_warnings: null,
        primary_uom: null,
        created_at: "2026-09-01T00:00:00Z",
      }
    );
    assert.equal(
      normalizeBuyerProductPrice({
        product_id: "p-1",
        selling_price: 500,
        currency: "INR",
        uom: "kg",
        gst_rate: 5,
        tax_inclusive: true,
        internal_margin_percent: 42,
        cost_price: 300,
      })?.selling_price,
      500
    );
    assert.equal(
      JSON.stringify(
        Object.keys(
          normalizeBuyerProductPrice({
            product_id: "p-1",
            selling_price: 500,
            currency: "INR",
            uom: "kg",
            gst_rate: 5,
            tax_inclusive: true,
            internal_margin_percent: 42,
          }) ?? {}
        ).sort()
      ),
      JSON.stringify([...BUYER_PRICE_FIELDS].sort())
    );
  });

  it("keeps the customer-safe field allowlist for catalogue and pricing projections", () => {
    const product = normalizePublishedProduct({
      product_id: "p-1",
      sku: "SKU-1",
      product_name: "Almond Baklawa",
      created_at: "2026-09-01T00:00:00Z",
    });
    assert.deepEqual(Object.keys(product ?? {}).sort(), [...PUBLISHED_PRODUCT_FIELDS].sort());

    const detailSource = readFileSync(join(ROOT, "screens/ProductDetailScreen.tsx"), "utf8");
    for (const forbidden of ["internal_cost", "cost_price", "supplier_id", "publication_state", "internal_margin"]) {
      assert.doesNotMatch(detailSource, new RegExp(`\\b${forbidden}\\b`));
    }
    assert.match(detailSource, /Product not found in the published catalogue/);
  });
});
