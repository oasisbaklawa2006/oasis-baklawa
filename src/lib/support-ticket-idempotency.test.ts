import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSupportTicketPayloadFingerprint,
  clearSupportTicketIdempotencyKey,
  getSupportTicketIdempotencyKey,
  reconcileLegacySupportTicketRetryAsCommitted,
  resetSupportTicketIdempotencyForTests,
} from "./support-ticket-idempotency";

const LEGACY_STORAGE_KEY = "oasis_buyer_support_ticket_idempotency_v1";

const browserStorage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem(key: string) {
        return browserStorage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        browserStorage.set(key, value);
      },
      removeItem(key: string) {
        browserStorage.delete(key);
      },
      clear() {
        browserStorage.clear();
      },
    },
  },
});

describe("support ticket idempotency", () => {
  beforeEach(() => {
    browserStorage.clear();
    resetSupportTicketIdempotencyForTests();
  });

  it("reuses one key only for the same normalized ticket payload", async () => {
    const fingerprint = buildSupportTicketPayloadFingerprint({
      orderId: "order-1",
      issueType: "Damaged goods",
      description: " Outer box was crushed ",
    });
    const first = await getSupportTicketIdempotencyKey(fingerprint);
    assert.match(first, /^[0-9a-f-]{36}$/i);
    assert.equal(await getSupportTicketIdempotencyKey(fingerprint), first);
  });

  it("rotates before retrying a changed payload", async () => {
    const firstFingerprint = buildSupportTicketPayloadFingerprint({
      orderId: "order-1",
      issueType: "Damaged goods",
      description: "Outer box was crushed",
    });
    const changedFingerprint = buildSupportTicketPayloadFingerprint({
      orderId: "order-1",
      issueType: "Missing items",
      description: "Two packs are missing",
    });

    const first = await getSupportTicketIdempotencyKey(firstFingerprint);
    const second = await getSupportTicketIdempotencyKey(changedFingerprint);
    assert.notEqual(first, second);
  });

  it("rotates after Core acknowledges even when the next payload is identical", async () => {
    const fingerprint = buildSupportTicketPayloadFingerprint({
      orderId: "order-1",
      issueType: "Damaged goods",
      description: "Outer box was crushed",
    });

    const first = await getSupportTicketIdempotencyKey(fingerprint);
    await clearSupportTicketIdempotencyKey();
    const second = await getSupportTicketIdempotencyKey(fingerprint);
    assert.notEqual(first, second);
  });

  it("serializes cold-start callers so one payload receives one key", async () => {
    const fingerprint = buildSupportTicketPayloadFingerprint({
      orderId: "order-1",
      issueType: "Damaged goods",
      description: "Outer box was crushed",
    });

    const keys = await Promise.all(
      Array.from({ length: 8 }, () => getSupportTicketIdempotencyKey(fingerprint))
    );
    assert.equal(new Set(keys).size, 1);
  });

  it("quarantines the legacy bare key until its outcome is reconciled", async () => {
    const legacyKey = "11111111-1111-4111-8111-111111111111";
    browserStorage.set(LEGACY_STORAGE_KEY, legacyKey);
    resetSupportTicketIdempotencyForTests();

    const fingerprint = buildSupportTicketPayloadFingerprint({
      orderId: "order-legacy",
      issueType: "Damaged goods",
      description: "Legacy retry",
    });

    await assert.rejects(
      () => getSupportTicketIdempotencyKey(fingerprint),
      /support_ticket_retry_outcome_unknown/
    );
    assert.equal(browserStorage.get(LEGACY_STORAGE_KEY), legacyKey);

    await reconcileLegacySupportTicketRetryAsCommitted();
    const fresh = await getSupportTicketIdempotencyKey(fingerprint);
    assert.notEqual(fresh, legacyKey);
  });
});
