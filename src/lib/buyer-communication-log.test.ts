import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBuyerCommunicationLog } from "./buyer-communication-log";

describe("buyer communication log", () => {
  it("merges tickets and general enquiries newest first", () => {
    const entries = buildBuyerCommunicationLog(
      [
        {
          ticket_id: "t-1",
          order_id: "o-1",
          order_number: "SO-1",
          issue_type: "Damaged Goods",
          description: "Box crushed",
          customer_status: "OPEN",
          product_sku: null,
          quantity_affected: null,
          created_at: "2026-09-01T10:00:00Z",
          updated_at: "2026-09-01T10:00:00Z",
          first_response_due: null,
          resolution_due: null,
          resolved_at: null,
          customer_rating: null,
        },
      ],
      [
        {
          query_id: "q-1",
          category: "GENERAL",
          subject: "Catalogue question",
          message: "Please confirm availability.",
          status: "SUBMITTED",
          created_at: "2026-09-02T10:00:00Z",
          updated_at: "2026-09-02T10:00:00Z",
        },
      ]
    );
    assert.equal(entries.length, 2);
    assert.equal(entries[0]?.kind, "general_enquiry");
    assert.equal(entries[1]?.kind, "order_ticket");
  });
});
