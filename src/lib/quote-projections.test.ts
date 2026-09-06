import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  customerQuotationStatusLabel,
  normalizeCustomerQuotation,
  normalizeCustomerQuotationDetail,
  quotationExpiryLabel,
} from "./quote-projections";

describe("quote projections", () => {
  it("normalizes only the customer-safe quotation projection", () => {
    assert.deepEqual(
      normalizeCustomerQuotation({
        quotation_id: "quote-1",
        quotation_number: "QT2026/09-0001",
        company_id: "company-1",
        status: "ISSUED",
        commercial_version_id: "version-1",
        commercial_version_number: 2,
        frozen_customer_total: 12500,
        currency: "INR",
        expires_at: "2026-09-30T00:00:00Z",
        issued_at: "2026-09-01T00:00:00Z",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-02T00:00:00Z",
        customer_safe_projection: true,
        internal_revision_token: "must-not-escape",
      }),
      {
        quotation_id: "quote-1",
        quotation_number: "QT2026/09-0001",
        company_id: "company-1",
        status: "ISSUED",
        commercial_version_id: "version-1",
        commercial_version_number: 2,
        frozen_customer_total: 12500,
        currency: "INR",
        expires_at: "2026-09-30T00:00:00Z",
        issued_at: "2026-09-01T00:00:00Z",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-02T00:00:00Z",
        customer_safe_projection: true,
      }
    );
    assert.equal(normalizeCustomerQuotation({ quotation_id: "quote-1" }), null);
  });

  it("bounds quotation detail lines to governed fields", () => {
    const detail = normalizeCustomerQuotationDetail({
      quotation_id: "quote-1",
      quotation_number: "QT2026/09-0001",
      company_id: "company-1",
      status: "ISSUED",
      commercial_version_id: null,
      commercial_version_number: null,
      frozen_customer_total: 5000,
      currency: "INR",
      expires_at: null,
      issued_at: "2026-09-01T00:00:00Z",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
      customer_safe_projection: true,
      terms_summary: "Payment terms as per account",
      lead_time_summary: "7-10 business days",
      lines: [
        {
          quotation_id: "quote-1",
          line_id: "line-1",
          product_id: "product-1",
          sku: "SKU-1",
          product_name: "Baklawa Assorted",
          quantity: 10,
          unit_price: 500,
          line_total: 5000,
          uom: "BOX",
          negotiated_margin: "must-not-escape",
        },
      ],
    });
    assert.equal(detail?.lines.length, 1);
    assert.equal(detail?.lines[0]?.line_total, 5000);
    assert.equal(detail?.terms_summary, "Payment terms as per account");
  });

  it("formats status and expiry labels from governed fields only", () => {
    assert.equal(customerQuotationStatusLabel("PENDING_REVIEW"), "PENDING REVIEW");
    assert.equal(quotationExpiryLabel(null), "Validity pending review");
    assert.match(quotationExpiryLabel("2026-09-30T00:00:00Z"), /Valid until/);
  });
});
