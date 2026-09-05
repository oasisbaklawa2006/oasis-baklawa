import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearGeneralQueryIdempotencyKey,
  getGeneralQueryIdempotencyKey,
  resetGeneralQueryIdempotencyForTests,
} from "./general-query-idempotency";

describe("general query idempotency", () => {
  beforeEach(() => {
    resetGeneralQueryIdempotencyForTests();
  });
  it("reuses one key across lost-response retries", async () => {
    const first = await getGeneralQueryIdempotencyKey();
    assert.match(first, /^[0-9a-f-]{36}$/i);
    assert.equal(await getGeneralQueryIdempotencyKey(), first);
  });

  it("rotates only after Core acknowledges the submission", async () => {
    const first = await getGeneralQueryIdempotencyKey();
    await clearGeneralQueryIdempotencyKey();
    const second = await getGeneralQueryIdempotencyKey();
    assert.notEqual(first, second);
  });
});
