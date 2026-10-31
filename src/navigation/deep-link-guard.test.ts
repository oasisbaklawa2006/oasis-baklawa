import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getStateFromPath } from "@react-navigation/core";
import { guardGetStateFromPath, isSafeDeepLinkPath, MAX_DEEP_LINK_LENGTH } from "./deep-link-guard";

const config = { screens: { OrderDetail: "order/:orderId", OrderConfirmation: "order/:orderId/confirmation", CommunicationLog: "communication/:entityId", CommercialReview: "commercial-review" } };
const guarded = guardGetStateFromPath((p: string) => getStateFromPath(p, config));

describe("deep-link guard", () => {
  it("accepts the real link shapes", () => {
    for (const p of ["order/3f2b8c1e-0d4a-4f6e-9a3b-1c2d3e4f5a6b", "order/abc/confirmation", "communication/xyz", "commercial-review", "order/abc?ref=a%20b"]) assert.equal(isSafeDeepLinkPath(p), true, p);
    assert.equal(guarded("order/abc")?.routes[0].name, "OrderDetail");
  });
  it("rejects oversized, escape-heavy, malformed and non-string input", () => {
    for (const bad of ["a".repeat(MAX_DEEP_LINK_LENGTH + 1), "order/x?q=" + "%AA".repeat(25), "order/x?q=%E0%A4%A", "order/x?q=%", "order/x?q=%zz", "", 42, null, undefined]) assert.equal(isSafeDeepLinkPath(bad), false, String(bad).slice(0, 30));
  });
  it("crafted attack strings return immediately instead of reaching the vulnerable decoder", () => {
    for (const attack of ["order/x?q=" + "%AA".repeat(40000), "nothing?q=" + "%E0%A4%A".repeat(20000), "order/x?q=" + "%AA".repeat(8)  + "a".repeat(100000)]) {
      const t = process.hrtime.bigint(); const r = guarded(attack); const ms = Number(process.hrtime.bigint() - t) / 1e6;
      assert.equal(r, undefined); assert.ok(ms < 50, `rejected in ${ms} ms`);
    }
  });
  it("a short escape-heavy link within the caps still parses quickly", () => {
    const t = process.hrtime.bigint(); guarded("order/x?q=" + "%AA".repeat(20)); assert.ok(Number(process.hrtime.bigint() - t) / 1e6 < 200);
  });

  it("handles encoded, double-encoded, control and Unicode vectors deterministically", () => {
    const accepted = ["order/x?ref=%20", "order/x?q=%C3%A9", "order/x?n=%2525", "order/x?z=%00", "order/%2e%2e%2fx", "order/x#frag", "order/é", "order/x?q=%C0"]; // syntactically valid escapes (even if invalid UTF-8) are bounded by the escape cap
    const rejected = ["order/x?q=%E0%A4%A", "order/x?q=%G1", "order/x?q=%", "order/x?q=%%41"];
    for (const p of accepted) assert.equal(isSafeDeepLinkPath(p), true, p);
    for (const p of rejected) assert.equal(isSafeDeepLinkPath(p), false, p);
    assert.equal(isSafeDeepLinkPath("a".repeat(MAX_DEEP_LINK_LENGTH)), true);
    assert.equal(isSafeDeepLinkPath("a".repeat(MAX_DEEP_LINK_LENGTH + 1)), false);
    assert.equal(isSafeDeepLinkPath("%41".repeat(24)), true);
    assert.equal(isSafeDeepLinkPath("%41".repeat(25)), false);
  });
  it("fuzz: 3000 seeded random inputs are rejected or parsed within bounded time", () => {
    let seed = 20261031; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const alphabet = ["%", "A", "0", "a", "/", "?", "=", "&", "1", "F", "z", "é", "%AA", "%41", "%E0", " "];
    let worst = 0, accepted = 0;
    for (let i = 0; i < 3000; i++) {
      const len = Math.floor(rnd() * 700); let p = "order/x?q=";
      for (let k = 0; k < len; k++) p += alphabet[Math.floor(rnd() * alphabet.length)];
      const t = process.hrtime.bigint(); const r = guarded(p); const ms = Number(process.hrtime.bigint() - t) / 1e6;
      if (r !== undefined) accepted++;
      worst = Math.max(worst, ms);
    }
    assert.ok(worst < 250, `worst case ${worst} ms`);
    assert.ok(accepted > 0);
  });
  it("the worst accepted shape (24 escapes at the length cap) stays cheap", () => {
    const attack = "order/x?q=" + "%AA".repeat(24) + "a".repeat(MAX_DEEP_LINK_LENGTH - 10 - 72);
    assert.equal(isSafeDeepLinkPath(attack), true);
    const t = process.hrtime.bigint(); guarded(attack); assert.ok(Number(process.hrtime.bigint() - t) / 1e6 < 100);
  });
});
