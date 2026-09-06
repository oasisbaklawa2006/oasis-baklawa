import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearQuoteAcceptIdempotencyKey,
  clearQuoteRequestIdempotencyKey,
  getQuoteAcceptIdempotencyKey,
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

  it("scopes accept idempotency per quotation", async () => {
    const first = await getQuoteAcceptIdempotencyKey("quote-1");
    const second = await getQuoteAcceptIdempotencyKey("quote-2");
    assert.notEqual(first, second);
    assert.equal(await getQuoteAcceptIdempotencyKey("quote-1"), first);
    await clearQuoteAcceptIdempotencyKey("quote-1");
    const third = await getQuoteAcceptIdempotencyKey("quote-1");
    assert.notEqual(third, first);
  });
});
