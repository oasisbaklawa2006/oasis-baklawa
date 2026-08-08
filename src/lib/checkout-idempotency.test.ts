import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearCheckoutIdempotencyKey,
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
    const storage = createMemoryStorage();
    let counter = 0;
    const createKey = () => `key-${++counter}`;

    const first = await resolveCheckoutIdempotencyKey("draft-a", storage, createKey);
    const second = await resolveCheckoutIdempotencyKey("draft-a", storage, createKey);

    assert.equal(first.key, second.key);
    assert.equal(second.reused, true);
    assert.equal(counter, 1);
  });

  it("B. remount reload reuses the same key", async () => {
    const storage = createMemoryStorage();
    const first = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "persisted-key");
    const remount = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "new-key");

    assert.equal(first.key, "persisted-key");
    assert.equal(remount.key, "persisted-key");
    assert.equal(remount.reused, true);
  });

  it("C. simulated app restart/storage reload reuses the same key", async () => {
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
    const storage = createMemoryStorage();
    await resolveCheckoutIdempotencyKey("draft-a", storage, () => "submit-key");
    await clearCheckoutIdempotencyKey("draft-a", storage);

    const afterClear = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "next-key");
    assert.equal(afterClear.key, "next-key");
    assert.equal(afterClear.reused, false);
  });

  it("E. ambiguous/network failure retains the key", async () => {
    const storage = createMemoryStorage();
    const first = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "retry-key");
    const retry = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "other-key");

    assert.equal(first.key, "retry-key");
    assert.equal(retry.key, "retry-key");
    assert.equal(retry.reused, true);
  });

  it("F. different draft uses a different key", async () => {
    const storage = createMemoryStorage();
    const draftA = await resolveCheckoutIdempotencyKey("draft-a", storage, () => "key-a");
    const draftB = await resolveCheckoutIdempotencyKey("draft-b", storage, () => "key-b");

    assert.equal(draftA.key, "key-a");
    assert.equal(draftB.key, "key-b");
    assert.notEqual(draftA.key, draftB.key);
  });

  it("handles AsyncStorage read/write failure without throwing", async () => {
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
    assert.equal(resolved.key, "fallback-key");
    assert.equal(resolved.storageError, true);

    await clearCheckoutIdempotencyKey("draft-a", failingStorage);
  });
});
