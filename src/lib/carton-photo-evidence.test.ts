import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FACTORY_PHOTOS } from "./carton-photo-evidence";

describe("factory photograph register", () => {
  it("has eleven unique photographs", () => {
    assert.equal(FACTORY_PHOTOS.length, 11);
    assert.equal(new Set(FACTORY_PHOTOS.map((p) => p.id)).size, 11);
    assert.equal(new Set(FACTORY_PHOTOS.map((p) => p.sha256)).size, 11);
  });
  it("never lets an open top view establish hidden layers, counts or clearances", () => {
    for (const p of FACTORY_PHOTOS.filter((x) => x.view === "open-top-view")) {
      assert.ok(p.doesNotEstablish.some((t) => /lower-layer/.test(t)), p.id);
      assert.ok(p.doesNotEstablish.some((t) => /clearance/.test(t)), p.id);
    }
  });
  it("supplies no open or populated 666×6 photograph and records that gap", () => {
    const six = FACTORY_PHOTOS.filter((p) => p.configHint === "bulk-6");
    assert.deepEqual(six.map((p) => p.view), ["closed-exterior"]);
    assert.ok(six[0].doesNotEstablish.some((t) => /interior packing of 666/.test(t)));
  });
  it("does not assert that the tall carton is RTC1×10", () => {
    for (const p of FACTORY_PHOTOS.filter((x) => x.configHint === "bulk-10-candidate" && x.view === "open-top-view")) {
      assert.ok(p.doesNotEstablish.some((t) => /RTC1×10|tray count|total box count/.test(t)));
    }
  });
});
