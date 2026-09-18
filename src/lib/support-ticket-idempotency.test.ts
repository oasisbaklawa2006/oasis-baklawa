import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSupportTicketPayloadFingerprint,
  clearSupportTicketIdempotencyKey,
  getSupportTicketIdempotencyKey,
  reconcileLegacySupportTicketRetryAsCommitted,
  resetSupportTicketIdempotencyForTests,
} from "./support-ticket-idempotency";

const STORAGE_KEY = "oasis_buyer_support_ticket_idempotency_v2";
const LEGACY_STORAGE_KEY = "oasis_buyer_support_ticket_idempotency_v1";

const browserStorage = new Map<string, string>();
let storageReadError = false;
let storageWriteError = false;

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem(key: string) {
        if (storageReadError) throw new Error("storage read failed");
        return browserStorage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        if (storageWriteError) throw new Error("storage write failed");
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
    storageReadError = false;
    storageWriteError = false;
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

  it("quarantines any persisted state that is not explicitly ready", async () => {
    browserStorage.set(
      STORAGE_KEY,
      JSON.stringify({
        key: "22222222-2222-4222-8222-222222222222",
        fingerprint: "prior-payload",
        state: "unexpected_future_state",
      })
    );
    resetSupportTicketIdempotencyForTests();

    await assert.rejects(
      () => getSupportTicketIdempotencyKey("new-payload"),
      /support_ticket_retry_outcome_unknown/
    );
  });

  it("fails closed when durable retry state cannot be read", async () => {
    storageReadError = true;
    resetSupportTicketIdempotencyForTests();

    await assert.rejects(
      () => getSupportTicketIdempotencyKey("payload"),
      /support_ticket_retry_state_unavailable/
    );
    assert.equal(browserStorage.size, 0);
  });

  it("fails closed when a new submission key cannot be persisted", async () => {
    storageWriteError = true;
    resetSupportTicketIdempotencyForTests();

    await assert.rejects(
      () => getSupportTicketIdempotencyKey("payload"),
      /support_ticket_retry_state_unavailable/
    );
    assert.equal(browserStorage.size, 0);
  });
});
