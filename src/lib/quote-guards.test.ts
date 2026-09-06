import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertQuotationCompanyMatch,
  canViewQuotation,
  isQuoteAcceptEnabled,
  isQuoteDeclineEnabled,
  isQuoteRequestEnabled,
  isQuotationExpired,
} from "./quote-guards";
import type { CustomerQuotation } from "@/types/quote-contract";

const issuedQuote: CustomerQuotation = {
  quotation_id: "quote-1",
  quotation_number: "QT2026/09-0001",
  company_id: "company-1",
  status: "ISSUED",
  commercial_version_id: "version-1",
  commercial_version_number: 1,
  frozen_customer_total: 12500,
  currency: "INR",
  expires_at: "2026-12-31T00:00:00Z",
  issued_at: "2026-09-01T00:00:00Z",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  customer_safe_projection: true,
};

describe("quote guards", () => {
  it("fails closed on company isolation", () => {
    assert.equal(assertQuotationCompanyMatch("company-1", "company-1"), true);
    assert.equal(assertQuotationCompanyMatch("company-1", "company-2"), false);
    assert.equal(assertQuotationCompanyMatch("company-1", null), false);
    assert.equal(canViewQuotation(issuedQuote, "company-2"), false);
    assert.equal(canViewQuotation({ ...issuedQuote, customer_safe_projection: false }, "company-1"), false);
  });

  it("detects expiry from server status and expires_at only", () => {
    assert.equal(isQuotationExpired({ ...issuedQuote, status: "EXPIRED" }), true);
    assert.equal(isQuotationExpired(issuedQuote, new Date("2026-09-01T00:00:00Z")), false);
    assert.equal(isQuotationExpired(issuedQuote, new Date("2027-01-01T00:00:00Z")), true);
    assert.equal(isQuotationExpired({ ...issuedQuote, expires_at: null }), false);
  });

  it("blocks accept and decline when backend contracts are unavailable", () => {
    const baseAccept = {
      quotation: issuedQuote,
      eligibleCompanyId: "company-1",
      accepting: false,
      keyReady: true,
      idempotencyKey: "key",
      keyPersisted: true,
      isOnline: true,
      backendAvailable: false,
    };
    assert.equal(isQuoteAcceptEnabled(baseAccept), false);
    assert.equal(isQuoteDeclineEnabled({ quotation: issuedQuote, eligibleCompanyId: "company-1", declining: false, isOnline: true, backendAvailable: false }), false);
    assert.equal(
      isQuoteRequestEnabled({
        lineCount: 2,
        submitting: false,
        keyReady: true,
        idempotencyKey: "key",
        keyPersisted: true,
        isOnline: true,
        backendAvailable: false,
      }),
      false
    );
  });

  it("blocks accept while offline or without persisted idempotency", () => {
    const base = {
      quotation: issuedQuote,
      eligibleCompanyId: "company-1",
      accepting: false,
      keyReady: true,
      idempotencyKey: "key",
      keyPersisted: true,
      isOnline: true,
      backendAvailable: true,
    };
    assert.equal(isQuoteAcceptEnabled({ ...base, isOnline: false }), false);
    assert.equal(isQuoteAcceptEnabled({ ...base, keyPersisted: false, idempotencyKey: null }), false);
    assert.equal(isQuoteAcceptEnabled({ ...base, accepting: true }), false);
    assert.equal(isQuoteAcceptEnabled({ ...base, quotation: { ...issuedQuote, status: "REQUESTED" } }), false);
    assert.equal(
      isQuoteAcceptEnabled({ ...base, quotation: issuedQuote, now: new Date("2027-01-01T00:00:00Z") }),
      false
    );
  });

  it("blocks decline while offline or after expiry", () => {
    assert.equal(
      isQuoteDeclineEnabled({
        quotation: issuedQuote,
        eligibleCompanyId: "company-1",
        declining: false,
        isOnline: false,
        backendAvailable: true,
      }),
      false
    );
    assert.equal(
      isQuoteDeclineEnabled({
        quotation: issuedQuote,
        eligibleCompanyId: "company-1",
        declining: true,
        isOnline: true,
        backendAvailable: true,
      }),
      false
    );
  });
});
