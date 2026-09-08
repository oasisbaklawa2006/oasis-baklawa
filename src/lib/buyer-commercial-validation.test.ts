import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  defaultOrderQuantity,
  quantityCompletionHint,
  resolveCommercialRules,
  validateDraftLinesAgainstPrices,
  validateOrderQuantity,
} from "./buyer-commercial-validation";
import type { BuyerProductPrice, CustomerOrderDraftLine } from "@/types/database.types";

const ROOT = join(__dirname, "..");

const ORDER_SURFACES = [
  { surface: "catalogue add-to-cart", file: "screens/CatalogueScreen.tsx" },
  { surface: "product detail add-to-cart", file: "screens/ProductDetailScreen.tsx" },
  { surface: "quick order / reorder", file: "screens/QuickOrderScreen.tsx" },
  { surface: "cart quantity adjustment", file: "screens/CartScreen.tsx" },
  { surface: "checkout submit guard", file: "screens/CheckoutScreen.tsx" },
] as const;

function samplePrice(overrides: Partial<BuyerProductPrice> = {}): BuyerProductPrice {
  return {
    product_id: "p-1",
    selling_price: 500,
    currency: "INR",
    uom: "kg",
    gst_rate: 5,
    tax_inclusive: true,
    applied_discount_percent: null,
    minimum_order_quantity: 10,
    minimum_order_uom: "kg",
    order_increment: 5,
    order_increment_uom: "kg",
    valid_from: "2026-01-01T00:00:00Z",
    valid_until: "2027-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Point73 buyer commercial validation contract", () => {
  it("fails closed when governed price/MOQ/increment/UOM fields are missing", () => {
    assert.equal(resolveCommercialRules(null).code, "PRICE_UNAVAILABLE");
    assert.equal(resolveCommercialRules(samplePrice({ uom: "" })).code, "UOM_UNRESOLVED");
    assert.equal(resolveCommercialRules(samplePrice({ minimum_order_quantity: null })).code, "MOQ_UNRESOLVED");
    assert.equal(resolveCommercialRules(samplePrice({ order_increment: null })).code, "INCREMENT_UNRESOLVED");
    assert.equal(resolveCommercialRules(samplePrice({ selling_price: 0 })).code, "PRICE_UNAVAILABLE");
  });

  it("fails closed on expired or not-yet-valid pricing windows", () => {
    const expired = resolveCommercialRules(
      samplePrice({ valid_until: "2020-01-01T00:00:00Z" }),
      new Date("2026-09-06T00:00:00Z")
    );
    assert.equal(expired.code, "PRICE_EXPIRED");

    const future = resolveCommercialRules(
      samplePrice({ valid_from: "2030-01-01T00:00:00Z" }),
      new Date("2026-09-06T00:00:00Z")
    );
    assert.equal(future.code, "PRICE_NOT_YET_VALID");
  });

  it("validates MOQ and carton increments without silently changing quantity", () => {
    const price = samplePrice();
    assert.equal(validateOrderQuantity(price, 8).code, "QUANTITY_BELOW_MOQ");
    assert.equal(validateOrderQuantity(price, 12).code, "QUANTITY_INCREMENT_MISMATCH");
    assert.equal(validateOrderQuantity(price, 15).orderable, true);
    assert.equal(quantityCompletionHint(10, 5, 8), "Add 2 more to reach MOQ 10");
    assert.equal(quantityCompletionHint(10, 5, 12), "Add 3 more to match order increments of 5");
  });

  it("accepts decimal MOQ and increment alignment", () => {
    const decimalPrice = samplePrice({ minimum_order_quantity: 0.1, order_increment: 0.1 });
    assert.equal(validateOrderQuantity(decimalPrice, 0.3).orderable, true);
    assert.equal(validateOrderQuantity(decimalPrice, 0.25).code, "QUANTITY_INCREMENT_MISMATCH");
  });

  it("fails closed on malformed pricing validity timestamps", () => {
    const malformed = resolveCommercialRules(samplePrice({ valid_until: "not-a-date" }));
    assert.equal(malformed.code, "PRICE_UNAVAILABLE");
    assert.match(malformed.message ?? "", /validity end/i);
  });

  it("does not invent MOQ defaults when pricing is incomplete", () => {
    assert.equal(defaultOrderQuantity(samplePrice({ minimum_order_quantity: null })), null);
    assert.equal(defaultOrderQuantity(samplePrice()), 10);
  });

  it("blocks checkout when draft lines fail current governed pricing rules", () => {
    const lines: CustomerOrderDraftLine[] = [
      {
        line_id: "l-1",
        product_id: "p-1",
        quantity: 12,
        unit_price_snapshot: 500,
        currency_snapshot: "INR",
        uom_snapshot: "kg",
        sku_snapshot: "SKU-1",
        product_name_snapshot: "Kaju Katli",
        line_total: 6000,
      },
    ];
    const prices = { "p-1": samplePrice() };
    assert.equal(validateDraftLinesAgainstPrices(lines, prices).orderable, false);
    assert.equal(validateDraftLinesAgainstPrices([{ ...lines[0], quantity: 15 }], prices).orderable, true);
  });

  it("binds every Buyer order surface to the shared commercial validation contract", () => {
    for (const row of ORDER_SURFACES) {
      const source = readFileSync(join(ROOT, row.file), "utf8");
      assert.match(source, /buyer-commercial-validation/, `${row.surface} must use buyer-commercial-validation`);
      assert.doesNotMatch(source, /minimum_order_quantity\s*\?\?\s*1/, `${row.surface} must not invent MOQ defaults`);
      assert.doesNotMatch(source, /order_increment\s*\?\?\s*1/, `${row.surface} must not invent increment defaults`);
    }
  });

  it("keeps checkout submit guards fail-closed on commercial validation", () => {
    const guards = readFileSync(join(ROOT, "lib/checkout-submit-guards.ts"), "utf8");
    assert.match(guards, /commercialValidationPassed/);
    const checkout = readFileSync(join(ROOT, "screens/CheckoutScreen.tsx"), "utf8");
    assert.match(checkout, /validateDraftLinesAgainstPrices/);
    assert.match(checkout, /commercialValidationPassed/);
  });

  it("separates Buyer UX validation from Core finance/terms authority", () => {
    const checkoutApi = readFileSync(join(ROOT, "lib/api/checkout.ts"), "utf8");
    assert.match(checkoutApi, /calculate_customer_advance_v1/);
    assert.match(checkoutApi, /submit_customer_order_v1/);
    assert.doesNotMatch(readFileSync(join(ROOT, "lib/buyer-commercial-validation.ts"), "utf8"), /payment_terms|credit_limit/);
  });
});
