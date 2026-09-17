import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearSupportTicketIdempotencyKey,
  getSupportTicketIdempotencyKey,
  resetSupportTicketIdempotencyForTests,
} from "./support-ticket-idempotency";

describe("support ticket idempotency", () => {
  beforeEach(() => {
    resetSupportTicketIdempotencyForTests();
  });

  it("reuses one key across lost-response retries -- this is the client half of the fix that " +
    "added submit_customer_support_ticket_v2 (branch support-ticket-idempotency-v2): v1 had no " +
    "idempotency protection at all, and a retry after a dropped/timed-out response created a " +
    "genuine duplicate ticket", async () => {
    const first = await getSupportTicketIdempotencyKey();
    assert.match(first, /^[0-9a-f-]{36}$/i);
    assert.equal(await getSupportTicketIdempotencyKey(), first);
  });

  it("rotates only after Core acknowledges the submission", async () => {
    const first = await getSupportTicketIdempotencyKey();
    await clearSupportTicketIdempotencyKey();
    const second = await getSupportTicketIdempotencyKey();
    assert.notEqual(first, second);
  });
});
