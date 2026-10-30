import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assess } from "./carton-feasibility";
import { CARTON_PHYSICAL_SPECS, inchesToMm, physicalSpecFor } from "./carton-physical-spec";
import { INITIAL_CARTON_CATALOGUE } from "./carton-builder";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

describe("physical master", () => {
  it("converts inches at 25.4 mm", () => {
    near(inchesToMm(15.5), 393.7); near(inchesToMm(10.75), 273.05); near(inchesToMm(13.75), 349.25);
    near(inchesToMm(20), 508); near(inchesToMm(13.25), 336.55); near(inchesToMm(13), 330.2); near(inchesToMm(8.5), 215.9);
  });
  it("keeps the four quantities separate and unconfirmed items null", () => {
    for (const s of CARTON_PHYSICAL_SPECS) {
      assert.equal(s.maxExternalStackCount, 4);
      assert.equal(s.confirmedArrangement, null);
      assert.equal(s.internalLevels, null);
      assert.equal(s.dimensionBasis, "unconfirmed");
      assert.equal(s.status, "inactive-specification-only");
    }
    assert.deepEqual(CARTON_PHYSICAL_SPECS.map((s) => s.primaryPacksPerCarton), [6, 4, 10]);
  });
  it("maps only to existing, inactive catalogue entries", () => {
    for (const s of CARTON_PHYSICAL_SPECS) {
      const c = INITIAL_CARTON_CATALOGUE.find((x) => x.id === s.configId)!;
      assert.ok(c && c.active === false);
      assert.equal(c.capacity, s.primaryPacksPerCarton);
    }
    assert.equal(physicalSpecFor("nope"), undefined);
  });
});

describe("dimensional feasibility (unverified assumptions, no invented tolerances)", () => {
  it("666×6: frozen two-column, three-level arrangement fits only if the figures are internal, with thin clearance", () => {
    const r = assess(physicalSpecFor("bulk-6")!);
    assert.equal(r.verdict, "feasible-under-unverified-assumptions");
    const f = r.frozenVisual!;
    assert.equal(f.fits, true);
    near(f.clearanceMm.L, 393.7 - 380); near(f.clearanceMm.B, 273.05 - 265); near(f.clearanceMm.H, 349.25 - 345);
    assert.ok(f.maxWallPerSideIfExternalMm.H < 2.2);
    // It is the only orientation reaching six boxes.
    assert.equal(r.orientationsThatFit.length, 1);
  });
  it("888×4: frozen two-column arrangement does not fit; no axis-aligned orientation holds four boxes", () => {
    const r = assess(physicalSpecFor("888x4")!);
    assert.equal(r.verdict, "dimensionally-incompatible");
    assert.equal(r.frozenVisual!.fits, false);
    near(r.frozenVisual!.clearanceMm.L, 508 - 520);
    assert.equal(r.bestCapacity, 3);
  });
  it("RTC1×10: a single vertical stack of ten nominal 32 mm trays fits with 10.2 mm height slack", () => {
    const r = assess(physicalSpecFor("bulk-10")!);
    assert.equal(r.verdict, "feasible-under-unverified-assumptions");
    const best = r.orientationsThatFit.find((f) => f.nz === 10)!;
    assert.equal(best.capacity, 10);
    near(best.slackMm.H, 330.2 - 320); near(best.slackMm.B, 215.9 - 210); near(best.slackMm.L, 330.2 - 300);
    assert.equal(r.frozenVisual, null);
    assert.ok(r.openConfirmations.some((q) => /nesting/.test(q)));
  });
});
