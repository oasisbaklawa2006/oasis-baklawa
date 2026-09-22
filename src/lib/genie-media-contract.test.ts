import assert from "node:assert/strict";
import test from "node:test";
import {
  assertKnownBoundedFileSize,
  resolveGenieMediaMimeType,
} from "./genie-media-contract";

test("resolves supported media MIME types from explicit metadata or extension", () => {
  assert.equal(resolveGenieMediaMimeType("image", "image/png", "po.bin"), "image/png");
  assert.equal(resolveGenieMediaMimeType("audio", undefined, "voice.WAV"), "audio/wav");
  assert.equal(resolveGenieMediaMimeType("document", undefined, "order.csv"), "text/csv");
});

test("rejects cross-mode or unsupported media MIME types", () => {
  assert.throws(() => resolveGenieMediaMimeType("image", "audio/wav", "po.png"));
  assert.throws(() => resolveGenieMediaMimeType("document", undefined, "order.xlsx"));
  assert.throws(() => resolveGenieMediaMimeType("audio", undefined, "voice.bin"));
});

test("file size guard fails closed when size is unavailable or invalid", () => {
  for (const value of [undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => assertKnownBoundedFileSize(value, 10 * 1024 * 1024, "Voice note"));
  }
  assert.doesNotThrow(() => assertKnownBoundedFileSize(1024, 10 * 1024 * 1024, "Voice note"));
  assert.throws(() =>
    assertKnownBoundedFileSize(10 * 1024 * 1024 + 1, 10 * 1024 * 1024, "Voice note")
  );
});
