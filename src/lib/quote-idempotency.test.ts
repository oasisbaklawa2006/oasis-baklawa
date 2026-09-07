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
  setQuoteIdempotencyStorageForTests,
  type QuoteIdempotencyStorage,
} from "./quote-idempotency";

function createMemoryStorage(seed?: Map<string, string>): QuoteIdempotencyStorage {
  const map = new Map(seed ?? []);
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
  };
}

function failingStorage(): QuoteIdempotencyStorage {
  return {
    getItem: async () => {
      throw new Error("storage unavailable");
    },
    setItem: async () => {
      throw new Error("storage unavailable");
    },
    removeItem: async () => {
      throw new Error("storage unavailable");
    },
  };
}

async function assertReusesFallbackAfterStorageFailure(getKey: () => Promise<string>): Promise<void> {
  const memory = createMemoryStorage();
  setQuoteIdempotencyStorageForTests(memory);
  const first = await getKey();
  setQuoteIdempotencyStorageForTests(failingStorage());
  assert.equal(await getKey(), first);
}

describe("quote idempotency", () => {
  beforeEach(() => {
    resetQuoteIdempotencyForTests();
    setQuoteIdempotencyStorageForTests(null);
  });

  it("reuses the quotation-request key until Core acknowledges submission", async () => {
    const first = await getQuoteRequestIdempotencyKey();
    assert.match(first, /^[0-9a-f-]{36}$/i);
    assert.equal(await getQuoteRequestIdempotencyKey(), first);
    await clearQuoteRequestIdempotencyKey();
    const second = await getQuoteRequestIdempotencyKey();
    assert.notEqual(second, first);
  });

  it("rotates the request key after acknowledgement so already_applied cannot block the next request", async () => {
    const acknowledged = await getQuoteRequestIdempotencyKey();
    await clearQuoteRequestIdempotencyKey();
    const nextRequest = await getQuoteRequestIdempotencyKey();
    assert.notEqual(nextRequest, acknowledged);
  });

  it("reuses in-memory fallback when storage fails after a key was cached", async () => {
    await assertReusesFallbackAfterStorageFailure(() => getQuoteRequestIdempotencyKey());
  });

  it("reuses accept fallback when storage fails after a key was cached", async () => {
    await assertReusesFallbackAfterStorageFailure(() => getQuoteAcceptIdempotencyKey("quote-accept"));
  });

  it("reuses decline fallback when storage fails after a key was cached", async () => {
    await assertReusesFallbackAfterStorageFailure(() => getQuoteDeclineIdempotencyKey("quote-decline"));
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
