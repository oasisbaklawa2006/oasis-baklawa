import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assess, stackCapacity } from "./carton-feasibility";
import { CARTON_PHYSICAL_SPECS, inchesToMm, physicalSpecFor } from "./carton-physical-spec";
import { INITIAL_CARTON_CATALOGUE } from "./carton-builder";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

describe("physical master", () => {
  it("converts inches at 25.4 mm", () => {
    near(inchesToMm(15.5), 393.7); near(inchesToMm(10.75), 273.05); near(inchesToMm(13.75), 349.25);
    near(inchesToMm(20.75), 527.05); near(inchesToMm(13.25), 336.55); near(inchesToMm(13), 330.2); near(inchesToMm(8.5), 215.9);
  });
  it("keeps the four quantities separate and unconfirmed items null", () => {
    for (const s of CARTON_PHYSICAL_SPECS) {
      assert.equal(s.maxExternalStackCount, 4);
      assert.equal(s.packTrial, "not-performed");
      assert.equal(s.dimensionBasis, "internal");
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

describe("dimensional feasibility (internal usable dimensions confirmed; lids, flaps and tolerance still unverified)", () => {
  it("666×6: the frozen two-across, three-level arrangement is the only six-box orientation; height is tightest", () => {
    const r = assess(physicalSpecFor("bulk-6")!);
    assert.equal(r.verdict, "mathematically-feasible");
    const f = r.frozenVisual!;
    assert.equal(f.fits, true);
    near(f.clearanceMm.L, 393.7 - 380); near(f.clearanceMm.B, 273.05 - 265); near(f.clearanceMm.H, 349.25 - 345);
    assert.equal(f.maxWallPerSideIfExternalMm, null);
    assert.equal(f.tightest.axis, "H"); near(f.tightest.clearanceMm, 4.25);
    assert.equal(r.orientationsThatFit.length, 1);
  });
  it("888×4: at 20.75 in the frozen two-across, two-level arrangement fits and is the only four-box orientation", () => {
    const r = assess(physicalSpecFor("888x4")!);
    assert.equal(r.verdict, "mathematically-feasible");
    const f = r.frozenVisual!;
    assert.equal(f.fits, true);
    near(f.required.L, 520); near(f.available.L, 527.05);
    near(f.clearanceMm.L, 7.05); near(f.clearanceMm.B, 9.25); near(f.clearanceMm.H, 16.55);
    assert.equal(f.tightest.axis, "L"); near(f.tightest.clearanceMm, 7.05);
    assert.equal(r.orientationsThatFit.length, 1);
    assert.equal(r.orientationsThatFit[0].capacity, 4);
    assert.deepEqual([r.orientationsThatFit[0].nx, r.orientationsThatFit[0].ny, r.orientationsThatFit[0].nz], [2, 1, 2]);
    assert.equal(r.bestCapacity, 4);
  });
  it("RTC1×10: one vertical stack of ten nominal 32 mm trays fits; breadth is tightest", () => {
    const r = assess(physicalSpecFor("bulk-10")!);
    assert.equal(r.verdict, "mathematically-feasible");
    const best = r.orientationsThatFit.find((f) => f.nz === 10 && f.orientation.alongL === 300)!;
    assert.equal(best.capacity, 10);
    near(best.slackMm.H, 330.2 - 320); near(best.slackMm.B, 215.9 - 210); near(best.slackMm.L, 330.2 - 300);
    assert.equal(r.frozenVisual, null);
    assert.ok(r.openConfirmations.some((q) => /nesting/.test(q)));
    assert.ok(r.openConfirmations.some((q) => /pack-and-close trial/.test(q)));
    assert.ok(!r.openConfirmations.some((q) => /external or internal/.test(q)));
    assert.ok(!r.openConfirmations.some((q) => /Confirm 'RTC1×10'/.test(q)), "identity is now confirmed");
  });
  it("an unconfirmed basis keeps the weaker verdict and the wall-thickness bound", () => {
    const spec = { ...physicalSpecFor("bulk-6")!, dimensionBasis: "unconfirmed" as const };
    const r = assess(spec);
    assert.equal(r.verdict, "feasible-under-unverified-assumptions");
    assert.ok(r.frozenVisual!.maxWallPerSideIfExternalMm!.H < 2.2);
    assert.ok(r.openConfirmations.some((q) => /external or internal/.test(q)));
  });
});

describe("evidence from the factory photographs", () => {
  it("888×4: the carton prints 20 in but 20.75 in is confirmed; at 20 in four boxes would not fit", () => {
    const spec = physicalSpecFor("888x4")!;
    assert.deepEqual(spec.printedCartonSizeIn, [20, 13.75, 13.25]);
    assert.equal(assess(spec).verdict, "mathematically-feasible");
    const printed = assess({ ...spec, cartonInches: spec.printedCartonSizeIn! });
    assert.equal(printed.verdict, "dimensionally-incompatible");
    assert.equal(printed.bestCapacity, 3);
  });
  it("RTC carton prints 32 mm and 40 mm options: ten fit only at 32 mm", () => {
    const spec = physicalSpecFor("bulk-10")!;
    assert.deepEqual(spec.printedHeightOptionsMm, [32, 40]);
    const h = inchesToMm(spec.cartonInches[2]);
    assert.equal(stackCapacity(h, 32), 10);
    assert.equal(stackCapacity(h, 40), 8);
  });
});

describe("owner confirmation of RTC1×10 (31 Oct 2026)", () => {
  it("records identity and the ten-tray vertical stack as owner-confirmed, and keeps the trial not performed", () => {
    const s = physicalSpecFor("bulk-10")!;
    assert.deepEqual(s.photographicIdentity, { status: "confirmed-by-owner", photoIds: ["FP-08", "FP-09", "FP-10", "FP-11"] });
    assert.deepEqual(s.confirmedArrangement, { columnsAcrossLength: 1, rowsAcrossBreadth: 1, levels: 10 });
    assert.equal(s.internalLevels, 10);
    assert.equal(s.arrangementBasis, "owner-specified");
    assert.equal(s.packTrial, "not-performed");
    assert.equal(s.maxExternalStackCount, 4);
    // Internal levels (10 trays) and the external stack limit (4 cartons) are different quantities.
    assert.notEqual(s.internalLevels, s.maxExternalStackCount);
  });
  it("the owner-specified stack fits mathematically; the trial is the open item", () => {
    const o = assess(physicalSpecFor("bulk-10")!).ownerArrangement!;
    assert.equal(o.fits, true);
    near(o.required.H, 320); near(o.clearanceMm.H, 10.2); near(o.clearanceMm.B, 5.9); near(o.clearanceMm.L, 30.2);
  });
  it("keeps the 40 mm option separate with unverified capacity", () => {
    const s = physicalSpecFor("bulk-10")!;
    assert.deepEqual(s.alternateHeights, [{ heightMm: 40, capacityStatus: "unverified" }]);
    assert.equal(s.primary.heightMm, 32);
    for (const other of ["bulk-6", "888x4"]) assert.deepEqual(physicalSpecFor(other)!.alternateHeights, []);
  });
  it("other cartons gain no confirmation they do not have", () => {
    for (const id of ["bulk-6", "888x4"]) {
      const s = physicalSpecFor(id)!;
      assert.equal(s.photographicIdentity, null);
      assert.equal(s.confirmedArrangement, null);
      assert.equal(s.arrangementBasis, "frozen-visual-provisional");
    }
  });
});
