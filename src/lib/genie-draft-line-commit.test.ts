import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  genieDraftCommitSignature,
  isGenieDraftLineCommitted,
  markGenieDraftLineCommitted,
  clearGenieDraftLineCommit,
  resetGenieDraftLineCommitForTests,
  setGenieDraftCommitStorageForTests,
  type GenieDraftCommitStorage,
} from "./genie-draft-line-commit";

function createMemoryStorage(): GenieDraftCommitStorage {
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

describe("genie draft line commit", () => {
  it("tracks committed payload signatures and clears them when a line is edited", async () => {
    resetGenieDraftLineCommitForTests();
    setGenieDraftCommitStorageForTests(createMemoryStorage());

    const original = { lineId: "line-1", productId: "p1", normalizedQuantity: 10 };
    await markGenieDraftLineCommitted(original);
    assert.equal(await isGenieDraftLineCommitted(original), true);

    const edited = { lineId: "line-1", productId: "p1", normalizedQuantity: 15 };
    assert.equal(await isGenieDraftLineCommitted(edited), false);

    await clearGenieDraftLineCommit("line-1");
    assert.equal(await isGenieDraftLineCommitted(original), false);
    assert.equal(genieDraftCommitSignature(edited), "line-1:p1:15");
  });
});
