import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INITIAL_CARTON_CATALOGUE, previewCarton, type CartonConfiguration, type SkuPackingProfile } from "./carton-builder";
import { describeCarton } from "./carton-presentation";
import { CARTON_PROGRESS_ANIMATION_MS, cartonAccessibility, cartonCellStates, cartonMotion, MAX_CARTON_CELLS, shouldShowCartonCells } from "./carton-visual-model";

const config: CartonConfiguration = { ...INITIAL_CARTON_CATALOGUE[0], active: true, eligiblePackingGroups: ["g"], mixablePackingGroupSets: [] };
const profile: SkuPackingProfile = { productId: "a", packingGroup: "g", slotsPerUnit: 1, commercialUom: "tray", cartonConfigIds: ["888x4"] };
const profiles = new Map([["a", profile]]);

describe("reduced motion", () => {
  it("disables animation entirely when reduced motion is on", () => {
    assert.deepEqual(cartonMotion(true), { animate: false, durationMs: 0 });
  });
  it("uses the short, fixed animation otherwise", () => {
    assert.deepEqual(cartonMotion(false), { animate: true, durationMs: CARTON_PROGRESS_ANIMATION_MS });
    assert.ok(CARTON_PROGRESS_ANIMATION_MS <= 250);
  });
});

describe("rendering limits", () => {
  it("draws one cell per slot up to the limit and none above or for invalid capacities", () => {
    assert.equal(shouldShowCartonCells(4), true);
    assert.equal(shouldShowCartonCells(MAX_CARTON_CELLS), true);
    assert.equal(shouldShowCartonCells(MAX_CARTON_CELLS + 1), false);
    for (const bad of [0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(shouldShowCartonCells(bad), false);
    assert.deepEqual(cartonCellStates({ capacity: 25, filledSlots: 3 }), []);
  });
  it("marks exactly the filled cells and clamps nonsense", () => {
    assert.deepEqual(cartonCellStates({ capacity: 4, filledSlots: 1 }), [true, false, false, false]);
    assert.deepEqual(cartonCellStates({ capacity: 4, filledSlots: 9 }), [true, true, true, true]);
    assert.deepEqual(cartonCellStates({ capacity: 4, filledSlots: -3 }), [false, false, false, false]);
  });
});

describe("screen-reader semantics", () => {
  const a11y = (n: number) => {
    const preview = previewCarton(config, n ? [{ productId: "a", quantity: n }] : [], profiles);
    return { preview, props: cartonAccessibility(config.label, describeCarton(preview, "tray"), preview) };
  };
  it("is a single accessible progressbar with a value", () => {
    const { props } = a11y(1);
    assert.equal(props.accessible, true);
    assert.equal(props.accessibilityRole, "progressbar");
    assert.deepEqual(props.accessibilityValue, { min: 0, max: 4, now: 1 });
  });
  it("announces name, fill and what remains", () => {
    const label = a11y(1).props.accessibilityLabel;
    assert.match(label, /Type A — 888×4/);
    assert.match(label, /1 tray of 4/);
    assert.match(label, /3 trays remaining/);
  });
  it("announces completion and an invalid carton plainly", () => {
    assert.match(a11y(4).props.accessibilityLabel, /Carton complete/);
    const bad = previewCarton(config, [{ productId: "ghost", quantity: 1 }], profiles);
    assert.match(cartonAccessibility(config.label, describeCarton(bad, "tray"), bad).accessibilityLabel, /needs a small adjustment/);
  });
  it("never reports a value outside its range", () => {
    const over = previewCarton(config, [{ productId: "a", quantity: 9 }], profiles);
    const v = cartonAccessibility(config.label, describeCarton(over, "tray"), over).accessibilityValue;
    assert.ok(v.now >= v.min && v.now <= v.max);
  });
});
