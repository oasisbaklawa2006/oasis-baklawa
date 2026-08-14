import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearCheckoutIdempotencyKey,
  resetCheckoutIdempotencyInFlightForTests,
  resolveCheckoutIdempotencyKey,
  type CheckoutIdempotencyStorage,
} from "./checkout-idempotency";

function createMemoryStorage(seed?: Map<string, string>) {
  const map = new Map(seed ?? []);
  return {
    map,
    getItem: async (key: string) => map.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: async (key: string) => {
      map.delete(key);
    },
  };
}

describe("checkout idempotency", () => {
  it("A. same mount retry reuses the same key", async () => {
    resetCheckoutIdempotencyInFlightForTests();
    const storage = createMemoryStorage();
    let counter = 0;
    const createKey = () => `key-${++counter}`;

    const first = await resolveCheckoutIdempotencyKey("draft-a", storage, createKey);
    const second = await resolveCheckoutIdempotencyKey("draft-a", storage, createKey);

    assert.equal(first.key, second.key);
    assert.equal(second.reused, true);
    assert.equal(first.persisted, true);
    assert.equal(counter, 1);
  });

  it("B. remount reload reuses the same key", async () => {
    resetCheckoutIdempotencyInFlightForTests();
    const storage = createMemoryStorage();
    const first = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "persisted-key");
    const remount = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "new-key");

    assert.equal(first.key, "persisted-key");
    assert.equal(remount.key, "persisted-key");
    assert.equal(remount.reused, true);
  });

  it("C. simulated app restart/storage reload reuses the same key", async () => {
    resetCheckoutIdempotencyInFlightForTests();
    const persistentDisk = new Map<string, string>();
    const persistentStorage: CheckoutIdempotencyStorage = {
      getItem: async (key) => persistentDisk.get(key) ?? null,
      setItem: async (key, value) => {
        persistentDisk.set(key, value);
      },
      removeItem: async (key) => {
        persistentDisk.delete(key);
      },
    };

    await resolveCheckoutIdempotencyKey("draft-a", persistentStorage, () => "restart-key");

    const afterRestart = await resolveCheckoutIdempotencyKey("draft-a", persistentStorage, () => "different");
    assert.equal(afterRestart.key, "restart-key");
    assert.equal(afterRestart.reused, true);
  });

  it("D. successful confirmed submit clears the stored key", async () => {
    resetCheckoutIdempotencyInFlightForTests();
    const storage = createMemoryStorage();
    await resolveCheckoutIdempotencyKey("draft-a", storage, () => "submit-key");
    await clearCheckoutIdempotencyKey("draft-a", storage);

    const afterClear = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "next-key");
    assert.equal(afterClear.key, "next-key");
    assert.equal(afterClear.reused, false);
  });

  it("E. ambiguous/network failure retains the key", async () => {
    resetCheckoutIdempotencyInFlightForTests();
    const storage = createMemoryStorage();
    const first = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "retry-key");
    const retry = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "other-key");

    assert.equal(first.key, "retry-key");
    assert.equal(retry.key, "retry-key");
    assert.equal(retry.reused, true);
  });

  it("F. different draft uses a different key", async () => {
    resetCheckoutIdempotencyInFlightForTests();
    const storage = createMemoryStorage();
    const draftA = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "key-a");
    const draftB = await resolveCheckoutIdempotencyKey("draft-b", storage, () => "key-b");

    assert.equal(draftA.key, "key-a");
    assert.equal(draftB.key, "key-b");
    assert.notEqual(draftA.key, draftB.key);
  });

  it("concurrent resolution for the same draft shares one key and one persistence write", async () => {
    resetCheckoutIdempotencyInFlightForTests();
    const map = new Map<string, string>();
    let releaseGetItem: () => void = () => undefined;
    const getItemGate = new Promise<void>((resolve) => {
      releaseGetItem = resolve;
    });

    let getItemCalls = 0;
    let setItemCalls = 0;
    let createCalls = 0;

    const storage: CheckoutIdempotencyStorage = {
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
    };

    const createKey = () => {
      createCalls += 1;
      return `key-${createCalls}`;
    };

    const first = resolveCheckoutIdempotencyKey("draft-a", storage, createKey);
    const second = resolveCheckoutIdempotencyKey("draft-a", storage, createKey);

    await new Promise((resolve) => setTimeout(resolve, 20));
    releaseGetItem();

    const [r1, r2] = await Promise.all([first, second]);
    assert.equal(r1.key, r2.key);
    assert.equal(r1.key, "key-1");
    assert.equal(getItemCalls, 1);
    assert.equal(setItemCalls, 1);
    assert.equal(createCalls, 1);
  });

  it("storage failure returns no persisted key for submission", async () => {
    resetCheckoutIdempotencyInFlightForTests();
    const failingStorage: CheckoutIdempotencyStorage = {
      getItem: async () => {
        throw new Error("read failed");
      },
      setItem: async () => {
        throw new Error("write failed");
      },
      removeItem: async () => {
        throw new Error("remove failed");
      },
    };

    const resolved = await resolveCheckoutIdempotencyKey("draft-a", failingStorage, () => "fallback-key");
    assert.equal(resolved.key, null);
    assert.equal(resolved.persisted, false);

    await clearCheckoutIdempotencyKey("draft-a", failingStorage);
  });
});
