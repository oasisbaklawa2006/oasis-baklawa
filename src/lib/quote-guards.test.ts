import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isQuoteAcceptEnabled,
  isQuoteDeclineEnabled,
  isQuoteRequestEnabled,
  isQuotationActionable,
  isQuotationVersionStaleError,
} from "./quote-guards";

const issuedQuote = {
  status: "issued",
  is_actionable: true,
  current_version: 1,
};

describe("quote guards", () => {
  it("uses Core is_actionable and issued status", () => {
    assert.equal(isQuotationActionable(issuedQuote), true);
    assert.equal(isQuotationActionable({ ...issuedQuote, is_actionable: false }), false);
    assert.equal(isQuotationActionable({ ...issuedQuote, status: "expired" }), false);
  });

  it("blocks mutations when backend contracts are unavailable", () => {
    assert.equal(
      isQuoteRequestEnabled({
        lineCount: 1,
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
      accepting: false,
      keyReady: true,
      idempotencyKey: "key",
      keyPersisted: true,
      isOnline: true,
    };
    assert.equal(isQuoteAcceptEnabled({ ...base, isOnline: false }), false);
    assert.equal(isQuoteAcceptEnabled({ ...base, keyPersisted: false, idempotencyKey: null }), false);
    assert.equal(isQuoteAcceptEnabled({ ...base, accepting: true }), false);
  });

  it("blocks decline while offline or while in flight", () => {
    assert.equal(
      isQuoteDeclineEnabled({ quotation: issuedQuote, declining: false, isOnline: false }),
      false
    );
    assert.equal(
      isQuoteDeclineEnabled({ quotation: issuedQuote, declining: true, isOnline: true }),
      false
    );
  });

  it("detects stale version errors for refetch", () => {
    assert.equal(isQuotationVersionStaleError("QUOTATION_VERSION_STALE: current version is 2"), true);
  });
});
