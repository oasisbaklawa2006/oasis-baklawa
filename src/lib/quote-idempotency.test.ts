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

function createMemoryStorage(backing?: Map<string, string>): QuoteIdempotencyStorage {
  const map = backing ?? new Map<string, string>();
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

function persistenceFailureAfterSeed(seed: Map<string, string>): QuoteIdempotencyStorage {
  const map = new Map(seed);
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async () => {
      throw new Error("storage write unavailable");
    },
    removeItem: async () => {
      throw new Error("storage delete unavailable");
    },
  };
}

type QuoteIdempotencyAction = {
  label: string;
  getKey: () => Promise<string>;
  clearKey: () => Promise<void>;
};

const quoteIdempotencyActions: QuoteIdempotencyAction[] = [
  {
    label: "request",
    getKey: () => getQuoteRequestIdempotencyKey(),
    clearKey: () => clearQuoteRequestIdempotencyKey(),
  },
  {
    label: "accept",
    getKey: () => getQuoteAcceptIdempotencyKey("quote-accept"),
    clearKey: () => clearQuoteAcceptIdempotencyKey("quote-accept"),
  },
  {
    label: "decline",
    getKey: () => getQuoteDeclineIdempotencyKey("quote-decline"),
    clearKey: () => clearQuoteDeclineIdempotencyKey("quote-decline"),
  },
];

async function assertReusesFallbackAfterStorageFailure(getKey: () => Promise<string>): Promise<void> {
  const memory = createMemoryStorage();
  setQuoteIdempotencyStorageForTests(memory);
  const first = await getKey();
  setQuoteIdempotencyStorageForTests(failingStorage());
  assert.equal(await getKey(), first);
}

async function assertRotatesAfterAcknowledgementDespitePersistenceFailure(
  action: QuoteIdempotencyAction
): Promise<void> {
  const backingMap = new Map<string, string>();
  setQuoteIdempotencyStorageForTests(createMemoryStorage(backingMap));
  const acknowledged = await action.getKey();
  setQuoteIdempotencyStorageForTests(persistenceFailureAfterSeed(backingMap));
  await action.clearKey();
  const nextKey = await action.getKey();
  assert.notEqual(nextKey, acknowledged);
  assert.equal(await action.getKey(), nextKey);
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

  for (const action of quoteIdempotencyActions) {
    it(`reuses in-memory fallback when storage read fails after ${action.label} key was cached`, async () => {
      await assertReusesFallbackAfterStorageFailure(action.getKey);
    });

    it(`rotates ${action.label} key after acknowledgement even when persistence delete/write fails`, async () => {
      await assertRotatesAfterAcknowledgementDespitePersistenceFailure(action);
    });
  }

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
