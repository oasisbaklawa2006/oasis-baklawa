import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  legacyPaymentIdempotencyKeyForTests,
  paymentIdempotencyKeyForTests,
  resetPaymentIdempotencyForTests,
  resolvePaymentIdempotencyKey,
  type PaymentIdempotencyStorage,
} from "./payment-idempotency";

function createMemoryStorage(): PaymentIdempotencyStorage {
  const map = new Map<string, string>();
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

describe("payment idempotency", () => {
  it("migrates pending v1 advance keys to v2 before generating a new key", async () => {
    resetPaymentIdempotencyForTests();
    const storage = createMemoryStorage();
    const orderId = "order-1";
    const legacyKey = legacyPaymentIdempotencyKeyForTests(orderId);
    const v2Key = paymentIdempotencyKeyForTests(orderId, "advance");

    await storage.setItem(legacyKey, "legacy-key-123");

    const resolved = await resolvePaymentIdempotencyKey(orderId, "advance", storage, () => "new-key-456");

    assert.equal(resolved.key, "legacy-key-123");
    assert.equal(resolved.reused, true);
    assert.equal(await storage.getItem(v2Key), "legacy-key-123");
    assert.equal(await storage.getItem(legacyKey), null);

    const retry = await resolvePaymentIdempotencyKey(orderId, "advance", storage, () => "another-key");
    assert.equal(retry.key, "legacy-key-123");
    assert.equal(retry.reused, true);
  });

  it("scopes v2 keys per payment purpose", async () => {
    resetPaymentIdempotencyForTests();
    const storage = createMemoryStorage();
    const orderId = "order-2";

    const advance = await resolvePaymentIdempotencyKey(orderId, "advance", storage, () => "advance-key");
    const balance = await resolvePaymentIdempotencyKey(orderId, "balance", storage, () => "balance-key");

    assert.equal(advance.key, "advance-key");
    assert.equal(balance.key, "balance-key");
    assert.notEqual(advance.key, balance.key);
  });
});
