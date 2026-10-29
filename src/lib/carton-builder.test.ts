import assert from "node:assert/strict";
import { test } from "node:test";
import { INITIAL_CARTON_CATALOGUE, previewCarton } from "./carton-builder";

const approved = { ...INITIAL_CARTON_CATALOGUE[0], active: true, eligibleGroups: ["loose-tray-compatible"] };
const line = (productId: string, quantity: number, packingGroup = "loose-tray-compatible") => ({ productId, quantity, packingGroup });

test("initial catalogue is extensible and has three distinct capacities", () => {
  assert.deepEqual(INITIAL_CARTON_CATALOGUE.map(c => c.capacity), [4, 6, 10]);
  assert.ok(INITIAL_CARTON_CATALOGUE.every(c => !c.active));
});
test("four-tray visual progress and sealed preview", () => {
  for (let n = 0; n <= 4; n++) {
    const p = previewCarton(approved, n ? [line("a", n)] : []);
    assert.equal(p.percentage, n * 25);
    assert.equal(p.remaining, 4 - n);
    assert.equal(p.state, n === 4 ? "sealed-preview" : n === 0 ? "empty" : "partial");
  }
  assert.equal(previewCarton(approved, [line("a", 4)], false).state, "full");
});
test("compatible mixed varieties fill carton without modifying quantities", () => {
  const lines = [line("a", 2), line("b", 2)];
  assert.equal(previewCarton(approved, lines).eligible, true);
  assert.deepEqual(lines.map(l => l.quantity), [2, 2]);
});
test("unknown group, inactive configuration, overflow, duplicates and fractions fail closed", () => {
  assert.equal(previewCarton(INITIAL_CARTON_CATALOGUE[0], [line("a", 4)]).eligible, false);
  assert.equal(previewCarton(approved, [line("a", 4, "unknown")]).eligible, false);
  assert.equal(previewCarton(approved, [line("a", 5)]).eligible, false);
  assert.equal(previewCarton(approved, [line("a", 2), line("a", 2)]).eligible, false);
  assert.equal(previewCarton(approved, [line("a", 1.5)]).eligible, false);
});
test("physical completeness is separate from commercial MOQ acceptance", () => {
  const physical = previewCarton(approved, [line("a", 4)]);
  assert.equal(physical.eligible, true);
  // Commercial acceptance is deliberately NOT returned by the physical preview.
  assert.equal("commerciallyOrderable" in physical, false);
});
