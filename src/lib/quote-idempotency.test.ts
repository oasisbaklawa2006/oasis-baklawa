import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearQuoteAcceptIdempotencyKey,
  clearQuoteDeclineIdempotencyKey,
  clearQuoteRequestIdempotencyKey,
  getQuoteAcceptIdempotencyKey,
  getQuoteDeclineIdempotencyKey,
  getQuoteRequestIdempotencyKey,
  resetQuoteIdempotencyForTests,
} from "./quote-idempotency";

describe("quote idempotency", () => {
  beforeEach(() => {
    resetQuoteIdempotencyForTests();
  });

  it("reuses the quotation-request key until Core acknowledges submission", async () => {
    const first = await getQuoteRequestIdempotencyKey();
    assert.match(first, /^[0-9a-f-]{36}$/i);
    assert.equal(await getQuoteRequestIdempotencyKey(), first);
    await clearQuoteRequestIdempotencyKey();
    const second = await getQuoteRequestIdempotencyKey();
    assert.notEqual(second, first);
  });

  it("scopes accept and decline idempotency per quotation", async () => {
    const acceptA = await getQuoteAcceptIdempotencyKey("quote-1");
    const acceptB = await getQuoteAcceptIdempotencyKey("quote-2");
    assert.notEqual(acceptA, acceptB);
    await clearQuoteAcceptIdempotencyKey("quote-1");
    assert.notEqual(await getQuoteAcceptIdempotencyKey("quote-1"), acceptA);

    const declineA = await getQuoteDeclineIdempotencyKey("quote-1");
    await clearQuoteDeclineIdempotencyKey("quote-1");
    assert.notEqual(await getQuoteDeclineIdempotencyKey("quote-1"), declineA);
  });
});
