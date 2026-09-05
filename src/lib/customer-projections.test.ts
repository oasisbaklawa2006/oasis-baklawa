import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalSupportIssueType,
  normalizeCustomerFinanceFacts,
  normalizeCustomerGeneralQuery,
  normalizeCustomerStatement,
  proformaAvailability,
} from "./customer-projections";

describe("customer projections", () => {
  it("preserves the established support-ticket issue vocabulary", () => {
    assert.equal(canonicalSupportIssueType("Damaged goods"), "Damaged Goods");
    assert.equal(canonicalSupportIssueType("Missing items"), "Missing Items");
    assert.equal(canonicalSupportIssueType("future customer label"), "Other");
  });

  it("normalizes only the customer-safe Finance projection", () => {
    assert.deepEqual(
      normalizeCustomerFinanceFacts({
        order_id: "order-1",
        order_number: "SO2026/09-0001",
        commercial_version_id: "version-1",
        commercial_version_number: 2,
        commercial_value: 12500,
        required_advance: 4000,
        pi_id: "pi-internal-id",
        pi_number: null,
        pi_status: "READY_FOR_ISSUE",
        verified_payment_amount: 1000,
        wallet_applied_amount: 500,
        approved_credit_amount: 0,
        covered_amount: 1500,
        advance_covered: false,
        finance_status: "advance_pending",
        facts_as_of: "2026-09-01T00:00:00Z",
        customer_safe_projection: true,
        internal_event_id: "must-not-escape",
      }),
      {
        order_id: "order-1",
        order_number: "SO2026/09-0001",
        commercial_version_id: "version-1",
        commercial_version_number: 2,
        commercial_value: 12500,
        required_advance: 4000,
        pi_id: "pi-internal-id",
        pi_number: null,
        pi_status: "READY_FOR_ISSUE",
        verified_payment_amount: 1000,
        wallet_applied_amount: 500,
        approved_credit_amount: 0,
        covered_amount: 1500,
        advance_covered: false,
        finance_status: "advance_pending",
        facts_as_of: "2026-09-01T00:00:00Z",
        customer_safe_projection: true,
      }
    );
    assert.equal(normalizeCustomerFinanceFacts({ order_id: "order-1" }), null);
  });

  it("drops internal statement metadata while retaining customer-safe facts", () => {
    assert.deepEqual(
      normalizeCustomerStatement({
        company_id: "company-1",
        wallet_balance: 2500,
        facts_as_of: "2026-09-01T00:00:00Z",
        statement_facts_only: true,
        entries: [
          {
            order_id: "order-1",
            invoice_date: "2026-08-31",
            invoice_number: "INV-1",
            invoice_gross_total: 12500,
            verified_payment_total: 4000,
            pre_dispatch_net_due: 8500,
            commercially_closed: false,
            commercial_closure_id: "internal-closure-id",
          },
        ],
      })?.entries[0],
      {
        order_id: "order-1",
        invoice_date: "2026-08-31",
        invoice_number: "INV-1",
        invoice_gross_total: 12500,
        verified_payment_total: 4000,
        wallet_applied_total: null,
        approved_credit_total: null,
        credit_note_total: null,
        debit_note_total: null,
        refund_total: null,
        pre_dispatch_net_due: 8500,
        complaint_window_status: null,
        complaint_deadline: null,
        commercially_closed: false,
      }
    );
    assert.equal(normalizeCustomerStatement({ entries: [] }), null);
  });

  it("bounds general-query history to the customer contract vocabulary", () => {
    assert.deepEqual(
      normalizeCustomerGeneralQuery({
        query_id: "query-1",
        category: "INTERNAL_QUEUE",
        subject: "Catalogue question",
        message: "Please confirm availability.",
        status: "INTERNAL_PENDING",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }),
      {
        query_id: "query-1",
        category: "GENERAL",
        subject: "Catalogue question",
        message: "Please confirm availability.",
        status: "SUBMITTED",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }
    );
  });

  it("derives proforma availability from issued PI facts only", () => {
    assert.equal(
      proformaAvailability(
        {
          pi_id: "pi-1",
          customer_visible_pi_number: "PI-001",
          order_id: "o-1",
          order_number: "SO-1",
          commercial_version_id: null,
          commercial_version_number: null,
          status: "ISSUED",
          issued_at: "2026-09-01T00:00:00Z",
          frozen_customer_total: 1000,
          created_at: "2026-09-01T00:00:00Z",
        },
        undefined
      ),
      "available"
    );
    assert.equal(proformaAvailability(undefined, { document_type: "PROFORMA_INVOICE", document_id: "d-1", document_number: null, order_id: "o-1", order_number: "SO-1", commercial_version_id: null, status: "READY_FOR_ISSUE", issued_at: null, customer_total: null, availability_state: "preparing" }), "preparing");
  });
});
