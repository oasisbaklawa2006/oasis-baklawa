import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  commitGenieResolvedLineToDraft,
  genieDraftCommitSignature,
  isGenieDraftLineCommitted,
  resetGenieDraftLineCommitForTests,
  setGenieDraftCommitStorageForTests,
  type GenieDraftCommitStorage,
  type GenieDraftLineWriter,
  type GenieResolvedCommitLine,
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

interface MockDraftLine {
  draftLineId: string;
  productId: string;
  quantity: number;
}

function createMockDraftWriter(): {
  writer: GenieDraftLineWriter;
  lines: MockDraftLine[];
  calls: { op: "add" | "update" | "remove"; draftLineId?: string; productId?: string; quantity?: number }[];
  failOnAddAfter?: number;
} {
  const lines: MockDraftLine[] = [];
  const calls: { op: "add" | "update" | "remove"; draftLineId?: string; productId?: string; quantity?: number }[] =
    [];
  let nextId = 1;
  let addCount = 0;
  let failOnAddAfter: number | undefined;

  const writer: GenieDraftLineWriter = {
    add: async (productId, quantity) => {
      addCount += 1;
      if (failOnAddAfter !== undefined && addCount > failOnAddAfter) {
        throw new Error("draft add failed");
      }
      const draftLineId = `draft-${nextId++}`;
      lines.push({ draftLineId, productId, quantity });
      calls.push({ op: "add", productId, quantity, draftLineId });
      return draftLineId;
    },
    update: async (draftLineId, quantity) => {
      const line = lines.find((entry) => entry.draftLineId === draftLineId);
      if (!line) throw new Error(`missing draft line ${draftLineId}`);
      line.quantity = quantity;
      calls.push({ op: "update", draftLineId, quantity });
    },
    remove: async (draftLineId) => {
      const index = lines.findIndex((entry) => entry.draftLineId === draftLineId);
      if (index >= 0) lines.splice(index, 1);
      calls.push({ op: "remove", draftLineId });
    },
  };

  return {
    writer,
    lines,
    calls,
    get failOnAddAfter() {
      return failOnAddAfter;
    },
    set failOnAddAfter(value: number | undefined) {
      failOnAddAfter = value;
    },
  };
}

describe("genie draft line commit", () => {
  it("tracks committed payload signatures without clearing on edit", async () => {
    resetGenieDraftLineCommitForTests();
    setGenieDraftCommitStorageForTests(createMemoryStorage());
    const mock = createMockDraftWriter();

    const original: GenieResolvedCommitLine = { lineId: "line-1", productId: "p1", normalizedQuantity: 10 };
    await commitGenieResolvedLineToDraft(original, mock.writer);
    assert.equal(await isGenieDraftLineCommitted(original), true);

    const edited: GenieResolvedCommitLine = { lineId: "line-1", productId: "p1", normalizedQuantity: 15 };
    assert.equal(await isGenieDraftLineCommitted(edited), false);
    assert.equal(genieDraftCommitSignature(edited), "line-1:p1:15");
  });

  it("partial commit then quantity edit retries with server update instead of duplicate add", async () => {
    resetGenieDraftLineCommitForTests();
    setGenieDraftCommitStorageForTests(createMemoryStorage());
    const mock = createMockDraftWriter();

    const lineA: GenieResolvedCommitLine = { lineId: "line-a", productId: "p1", normalizedQuantity: 10 };
    const lineB: GenieResolvedCommitLine = { lineId: "line-b", productId: "p2", normalizedQuantity: 5 };

    await commitGenieResolvedLineToDraft(lineA, mock.writer);
    mock.failOnAddAfter = 1;
    await assert.rejects(() => commitGenieResolvedLineToDraft(lineB, mock.writer), /draft add failed/);
    assert.equal(mock.lines.length, 1);
    assert.deepEqual(mock.lines[0], { draftLineId: "draft-1", productId: "p1", quantity: 10 });

    const editedLineA: GenieResolvedCommitLine = { lineId: "line-a", productId: "p1", normalizedQuantity: 15 };
    mock.failOnAddAfter = undefined;
    await commitGenieResolvedLineToDraft(editedLineA, mock.writer);
    await commitGenieResolvedLineToDraft(lineB, mock.writer);

    assert.equal(mock.lines.length, 2);
    assert.deepEqual(mock.lines[0], { draftLineId: "draft-1", productId: "p1", quantity: 15 });
    assert.deepEqual(mock.lines[1], { draftLineId: "draft-2", productId: "p2", quantity: 5 });
    assert.deepEqual(
      mock.calls.filter((call) => call.op === "add"),
      [
        { op: "add", productId: "p1", quantity: 10, draftLineId: "draft-1" },
        { op: "add", productId: "p2", quantity: 5, draftLineId: "draft-2" },
      ]
    );
    assert.deepEqual(mock.calls.filter((call) => call.op === "update"), [
      { op: "update", draftLineId: "draft-1", quantity: 15 },
    ]);
    assert.equal(await isGenieDraftLineCommitted(editedLineA), true);
    assert.equal(await isGenieDraftLineCommitted(lineB), true);
  });

  it("partial commit then product edit replaces the remote draft line instead of duplicating", async () => {
    resetGenieDraftLineCommitForTests();
    setGenieDraftCommitStorageForTests(createMemoryStorage());
    const mock = createMockDraftWriter();

    const original: GenieResolvedCommitLine = { lineId: "line-1", productId: "p1", normalizedQuantity: 10 };
    await commitGenieResolvedLineToDraft(original, mock.writer);

    const edited: GenieResolvedCommitLine = { lineId: "line-1", productId: "p2", normalizedQuantity: 12 };
    await commitGenieResolvedLineToDraft(edited, mock.writer);

    assert.equal(mock.lines.length, 1);
    assert.deepEqual(mock.lines[0], { draftLineId: "draft-2", productId: "p2", quantity: 12 });
    assert.deepEqual(mock.calls, [
      { op: "add", productId: "p1", quantity: 10, draftLineId: "draft-1" },
      { op: "remove", draftLineId: "draft-1" },
      { op: "add", productId: "p2", quantity: 12, draftLineId: "draft-2" },
    ]);
  });

  it("skips unchanged committed lines on retry", async () => {
    resetGenieDraftLineCommitForTests();
    setGenieDraftCommitStorageForTests(createMemoryStorage());
    const mock = createMockDraftWriter();

    const line: GenieResolvedCommitLine = { lineId: "line-1", productId: "p1", normalizedQuantity: 10 };
    await commitGenieResolvedLineToDraft(line, mock.writer);
    await commitGenieResolvedLineToDraft(line, mock.writer);

    assert.equal(mock.calls.length, 1);
    assert.equal(await isGenieDraftLineCommitted(line), true);
  });
});
