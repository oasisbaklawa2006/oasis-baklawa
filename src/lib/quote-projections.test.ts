import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  customerQuotationStatusLabel,
  normalizeCustomerQuotationDetail,
  normalizeCustomerQuotationLine,
  normalizeCustomerQuotationSummary,
  quotationExpiryLabel,
  termsSnapshotLabel,
} from "./quote-projections";

describe("quote projections", () => {
  it("normalizes governed quotation list rows", () => {
    assert.deepEqual(
      normalizeCustomerQuotationSummary({
        quotation_id: "quote-1",
        quotation_number: "QT2026/09-0001",
        status: "issued",
        current_version: 1,
        quotation_value: 12500,
        advance_required: 4000,
        expires_at: "2026-09-30T00:00:00Z",
        is_actionable: true,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-02T00:00:00Z",
        internal_field: "must-not-escape",
      }),
      {
        quotation_id: "quote-1",
        quotation_number: "QT2026/09-0001",
        status: "issued",
        current_version: 1,
        quotation_value: 12500,
        advance_required: 4000,
        expires_at: "2026-09-30T00:00:00Z",
        is_actionable: true,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-02T00:00:00Z",
      }
    );
    assert.equal(normalizeCustomerQuotationSummary({ quotation_id: "quote-1" }), null);
  });

  it("normalizes detail and line facts from Core projections", () => {
    const detail = normalizeCustomerQuotationDetail({
      quotation_id: "quote-1",
      quotation_number: "QT2026/09-0001",
      status: "expired",
      current_version: 2,
      version_id: "version-2",
      quotation_value: 5000,
      advance_required: 1000,
      expires_at: "2026-09-01T00:00:00Z",
      is_actionable: false,
      request_notes: "Trial order",
      terms_snapshot: { validity_days: 30, currency: "INR" },
      commercial_snapshot: [],
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    });
    assert.equal(detail?.status, "expired");
    assert.equal(termsSnapshotLabel(detail?.terms_snapshot ?? null), "30-day validity · INR");

    const line = normalizeCustomerQuotationLine({
      line_id: "line-1",
      product_id: "product-1",
      sku: "SKU-1",
      product_name: "Baklawa Assorted",
      quantity: 10,
      unit_price: 500,
      line_total: 5000,
      currency: "INR",
      uom: "BOX",
      gst_rate: 0,
      tax_inclusive: true,
      minimum_order_quantity: 10,
      order_increment: 1,
      min_carton_qty: null,
      version_number: 2,
    });
    assert.equal(line?.line_total, 5000);

    const lineWithoutSku = normalizeCustomerQuotationLine({
      line_id: "line-2",
      product_id: "product-2",
      sku: null,
      product_name: "Unlabelled item",
      quantity: 5,
      unit_price: 100,
      line_total: 500,
      currency: "INR",
      uom: null,
      gst_rate: null,
      tax_inclusive: false,
      minimum_order_quantity: null,
      order_increment: null,
      min_carton_qty: null,
      version_number: 1,
    });
    assert.equal(lineWithoutSku?.sku, null);
    assert.equal(lineWithoutSku?.line_total, 500);
  });

  it("formats status and expiry labels", () => {
    assert.equal(customerQuotationStatusLabel("superseded"), "superseded");
    assert.match(quotationExpiryLabel("2026-09-30T00:00:00Z"), /Valid until/);
  });
});
