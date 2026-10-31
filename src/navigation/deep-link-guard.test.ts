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
});
