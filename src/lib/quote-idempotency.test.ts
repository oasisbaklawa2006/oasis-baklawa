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

type QuoteIdempotencyAction = {
  label: string;
  getKey: () => Promise<{ key: string | null; persisted: boolean }>;
  clearKey: () => Promise<{ key: string | null; persisted: boolean }>;
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

describe("quote idempotency", () => {
  beforeEach(() => {
    resetQuoteIdempotencyForTests();
    setQuoteIdempotencyStorageForTests(createMemoryStorage());
  });

  it("reuses the quotation-request key until Core acknowledges submission", async () => {
    const first = await getQuoteRequestIdempotencyKey();
    assert.match(first.key ?? "", /^[0-9a-f-]{36}$/i);
    assert.equal(first.persisted, true);
    assert.deepEqual(await getQuoteRequestIdempotencyKey(), first);
    await clearQuoteRequestIdempotencyKey();
    const second = await getQuoteRequestIdempotencyKey();
    assert.notEqual(second.key, first.key);
    assert.equal(second.persisted, true);
  });

  it("fails closed when quotation mutation keys cannot be persisted", async () => {
    setQuoteIdempotencyStorageForTests(failingStorage());
    const request = await getQuoteRequestIdempotencyKey();
    assert.equal(request.key, null);
    assert.equal(request.persisted, false);
  });

  for (const action of quoteIdempotencyActions) {
    it(`coalesces concurrent ${action.label} key resolution to one storage read and one key`, async () => {
      const map = new Map<string, string>();
      let releaseGetItem: () => void = () => undefined;
      const getItemGate = new Promise<void>((resolve) => {
        releaseGetItem = resolve;
      });

      let getItemCalls = 0;
      let setItemCalls = 0;

      setQuoteIdempotencyStorageForTests({
        getItem: async (key) => {
          getItemCalls += 1;
          await getItemGate;
          return map.get(key) ?? null;
        },
        setItem: async (key, value) => {
          setItemCalls += 1;
          map.set(key, value);
        },
        removeItem: async (key) => {
          map.delete(key);
        },
      });

      const first = action.getKey();
      const second = action.getKey();

      await new Promise((resolve) => setTimeout(resolve, 20));
      releaseGetItem();

      const [keyA, keyB] = await Promise.all([first, second]);
      assert.equal(keyA.key, keyB.key);
      assert.match(keyA.key ?? "", /^[0-9a-f-]{36}$/i);
      assert.equal(keyA.persisted, true);
      assert.equal(getItemCalls, 1);
      assert.equal(setItemCalls, 1);
    });
  }

  it("scopes accept and decline idempotency per quotation", async () => {
    const acceptA = await getQuoteAcceptIdempotencyKey("quote-1");
    const acceptB = await getQuoteAcceptIdempotencyKey("quote-2");
    assert.notEqual(acceptA.key, acceptB.key);
    await clearQuoteAcceptIdempotencyKey("quote-1");
    assert.notEqual((await getQuoteAcceptIdempotencyKey("quote-1")).key, acceptA.key);

    const declineA = await getQuoteDeclineIdempotencyKey("quote-1");
    await clearQuoteDeclineIdempotencyKey("quote-1");
    assert.notEqual((await getQuoteDeclineIdempotencyKey("quote-1")).key, declineA.key);
  });
});
