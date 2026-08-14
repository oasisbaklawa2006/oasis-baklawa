import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCatalogueColumns, getContentWidth, getDeviceClass } from "./layout-utils";

describe("responsive layout", () => {
  it("classifies phone, tablet portrait and landscape", () => {
    assert.equal(getDeviceClass(390, 844), "phone");
    assert.equal(getDeviceClass(820, 1180), "tablet");
    assert.equal(getDeviceClass(1180, 820), "tabletLandscape");
  });

  it("bounds content width on large screens", () => {
    assert.equal(getContentWidth(1200), 720);
    assert.equal(getContentWidth(360), 312);
  });

  it("returns responsive catalogue columns", () => {
    assert.equal(getCatalogueColumns("phone"), 1);
    assert.equal(getCatalogueColumns("tablet"), 2);
    assert.equal(getCatalogueColumns("tabletLandscape"), 3);
  });
});
