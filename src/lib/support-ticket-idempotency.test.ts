import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSupportTicketPayloadFingerprint,
  clearSupportTicketIdempotencyKey,
  getSupportTicketIdempotencyKey,
  resetSupportTicketIdempotencyForTests,
} from "./support-ticket-idempotency";

describe("support ticket idempotency", () => {
  beforeEach(() => {
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

  it("serializes concurrent cold-start requests so one payload gets one key", async () => {
    const fingerprint = buildSupportTicketPayloadFingerprint({
      orderId: "order-1",
      issueType: "Damaged goods",
      description: "Outer box was crushed",
    });

    const [first, second, third] = await Promise.all([
      getSupportTicketIdempotencyKey(fingerprint),
      getSupportTicketIdempotencyKey(fingerprint),
      getSupportTicketIdempotencyKey(fingerprint),
    ]);

    assert.equal(second, first);
    assert.equal(third, first);
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

  it("rotates immediately after Core acknowledges the same payload", async () => {
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
});
