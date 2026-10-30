import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INITIAL_CARTON_CATALOGUE,
  planCartons,
  previewCarton,
  resolveCartonConfiguration,
  unitsToComplete,
  validateCartonCatalogue,
  validateCartonConfiguration,
  type CartonConfiguration,
  type SkuPackingProfile,
} from "./carton-builder";

const base = INITIAL_CARTON_CATALOGUE[0];
const cfg = (over: Partial<CartonConfiguration> = {}): CartonConfiguration => ({
  ...base,
  active: true,
  eligiblePackingGroups: ["tray-a", "tray-b"],
  mixablePackingGroupSets: [["tray-a", "tray-b"]],
  ...over,
});
const profile = (productId: string, over: Partial<SkuPackingProfile> = {}): SkuPackingProfile => ({
  productId,
  packingGroup: "tray-a",
  slotsPerUnit: 1,
  commercialUom: "tray",
  cartonConfigIds: ["888x4"],
  ...over,
});
const registry = (...profiles: SkuPackingProfile[]) => new Map(profiles.map((p) => [p.productId, p]));
const line = (productId: string, quantity: number) => ({ productId, quantity });

describe("carton catalogue and configuration", () => {
  it("ships three distinct, inactive, extensible initial configurations", () => {
    assert.deepEqual(INITIAL_CARTON_CATALOGUE.map((c) => c.capacity), [4, 6, 10]);
    assert.ok(INITIAL_CARTON_CATALOGUE.every((c) => !c.active && c.eligiblePackingGroups.length === 0));
    assert.deepEqual(validateCartonCatalogue(INITIAL_CARTON_CATALOGUE), []);
  });
  it("supports arbitrary future capacities and rejects invalid ones", () => {
    assert.deepEqual(validateCartonConfiguration(cfg({ id: "x24", capacity: 24 })), []);
    assert.ok(validateCartonConfiguration(cfg({ capacity: 0 })).length);
    assert.ok(validateCartonConfiguration(cfg({ capacity: 2.5 })).length);
    assert.ok(validateCartonConfiguration(cfg({ capacity: 4, slotArrangement: { columns: 3, rows: 2 } })).length);
    assert.deepEqual(validateCartonConfiguration(cfg({ capacity: 6, slotArrangement: { columns: 3, rows: 2 } })), []);
  });
  it("detects duplicate id+version and mixable groups that are not eligible", () => {
    assert.ok(validateCartonCatalogue([cfg(), cfg()]).some((p) => p.includes("Duplicate")));
    assert.ok(validateCartonConfiguration(cfg({ mixablePackingGroupSets: [["tray-a", "ghost"]] })).length);
  });
  it("resolves the highest effective active version and honours effective dates", () => {
    const v1 = cfg({ version: 1 });
    const v2 = cfg({ version: 2 });
    const future = cfg({ version: 3, effectiveFrom: "2030-01-01T00:00:00Z" });
    const expired = cfg({ version: 4, effectiveUntil: "2020-01-01T00:00:00Z" });
    const inactive = cfg({ version: 5, active: false });
    assert.equal(resolveCartonConfiguration([v1, v2, future, expired, inactive], "888x4", new Date("2026-10-30"))?.version, 2);
    assert.equal(resolveCartonConfiguration([inactive], "888x4"), null);
    assert.equal(resolveCartonConfiguration([v1], "missing"), null);
    assert.equal(resolveCartonConfiguration([cfg({ effectiveFrom: "not-a-date" })], "888x4"), null);
  });
});

describe("888x4 visual progression (0..4 plus sealed)", () => {
  const profiles = registry(profile("a"));
  const expected = [
    { n: 0, pct: 0, key: "empty", state: "empty" },
    { n: 1, pct: 25, key: "slot-1", state: "partial" },
    { n: 2, pct: 50, key: "slot-2", state: "partial" },
    { n: 3, pct: 75, key: "slot-3", state: "partial" },
    { n: 4, pct: 100, key: "sealed", state: "sealed-preview" },
  ] as const;
  for (const e of expected) {
    it(`${e.n}/4 => ${e.pct}% ${e.key}`, () => {
      const p = previewCarton(cfg(), e.n ? [line("a", e.n)] : [], profiles);
      assert.equal(p.percentage, e.pct);
      assert.equal(p.remainingSlots, 4 - e.n);
      assert.equal(p.visualKey, e.key);
      assert.equal(p.state, e.state);
      assert.equal(p.physicallyComplete, e.n === 4);
    });
  }
  it("shows plain 'full' when the sealed illustration is disabled", () => {
    const p = previewCarton(cfg(), [line("a", 4)], profiles, { showSealed: false });
    assert.equal(p.state, "full");
    assert.equal(p.visualKey, "full");
  });
  it("works for capacities 6 and 10 with the same engine", () => {
    for (const capacity of [6, 10]) {
      const c = cfg({ id: `c${capacity}`, capacity });
      const reg = registry(profile("a", { cartonConfigIds: [c.id] }));
      assert.equal(previewCarton(c, [line("a", capacity)], reg).physicallyComplete, true);
      assert.equal(previewCarton(c, [line("a", capacity - 1)], reg).remainingSlots, 1);
      assert.equal(previewCarton(c, [line("a", capacity + 1)], reg).issues[0].code, "CAPACITY_EXCEEDED");
    }
  });
});

describe("mixed variants and compatibility (fail closed)", () => {
  it("allows verified mixed variants and keeps customer quantities untouched", () => {
    const reg = registry(profile("a"), profile("b", { packingGroup: "tray-b" }));
    const lines = [line("b", 1), line("a", 3)];
    const p = previewCarton(cfg(), lines, reg);
    assert.equal(p.physicallyComplete, true);
    assert.deepEqual(p.allocations.map((x) => [x.productId, x.quantity]), [["a", 3], ["b", 1]]);
    assert.deepEqual(lines.map((l) => l.quantity), [1, 3]);
  });
  it("is deterministic regardless of input order", () => {
    const reg = registry(profile("a"), profile("b", { packingGroup: "tray-b" }));
    assert.deepEqual(previewCarton(cfg(), [line("a", 2), line("b", 2)], reg), previewCarton(cfg(), [line("b", 2), line("a", 2)], reg));
  });
  it("rejects groups mixed without an explicit rule, even if capacity fits", () => {
    const reg = registry(profile("a"), profile("b", { packingGroup: "tray-b" }));
    const p = previewCarton(cfg({ mixablePackingGroupSets: [] }), [line("a", 2), line("b", 2)], reg);
    assert.equal(p.physicallyComplete, false);
    assert.ok(p.issues.some((i) => i.code === "MIX_NOT_VERIFIED"));
  });
  it("fails closed for unknown, ineligible and unaccepted SKUs", () => {
    const reg = registry(profile("a"), profile("other", { cartonConfigIds: ["bulk-6"] }), profile("g", { packingGroup: "mystery" }), profile("bad", { slotsPerUnit: 0 }));
    const codes = (id: string) => previewCarton(cfg(), [line(id, 1)], reg).issues.map((i) => i.code);
    assert.deepEqual(codes("unknown"), ["PROFILE_MISSING"]);
    assert.deepEqual(codes("other"), ["SKU_NOT_ELIGIBLE"]);
    assert.deepEqual(codes("g"), ["GROUP_NOT_ACCEPTED"]);
    assert.deepEqual(codes("bad"), ["PROFILE_INVALID"]);
  });
  it("never trusts caller-supplied groups and never resolves inherited object members (merged from PR #66 review)", () => {
    const plain: Record<string, SkuPackingProfile> = { a: profile("a") };
    const codes = (id: string, r: Record<string, SkuPackingProfile> | Map<string, SkuPackingProfile>) =>
      previewCarton(cfg(), [line(id, 4)], r).issues.map((i) => i.code);
    assert.deepEqual(codes("a", plain), []);
    assert.deepEqual(codes("unmapped", plain), ["PROFILE_MISSING"]);
    assert.deepEqual(codes("toString", plain), ["PROFILE_MISSING"]);
    assert.deepEqual(codes("__proto__", plain), ["PROFILE_MISSING"]);
    assert.deepEqual(codes("a", {}), ["PROFILE_MISSING"]);
    assert.deepEqual(codes("a", registry(profile("a", { packingGroup: "other" }))), ["GROUP_NOT_ACCEPTED"]);
  });
  it("rejects a packing profile keyed to a different product id", () => {
    const miskeyedMap = new Map([["a", profile("b")]]);
    const miskeyedObject: Record<string, SkuPackingProfile> = { a: profile("b") };
    for (const mismatched of [miskeyedMap, miskeyedObject]) {
      const preview = previewCarton(cfg(), [line("a", 4)], mismatched);
      assert.deepEqual(preview.issues.map((issue) => issue.code), ["PROFILE_INVALID"]);
      assert.equal(preview.physicallyComplete, false);
      const plan = planCartons(cfg(), [line("a", 4)], mismatched);
      assert.deepEqual(plan.cartons, []);
      assert.deepEqual(plan.unplaceable.map((issue) => issue.code), ["PROFILE_INVALID"]);
    }
  });
  it("fails closed for inactive config, empty verified groups, duplicates and fractions", () => {
    const reg = registry(profile("a"));
    assert.ok(previewCarton(INITIAL_CARTON_CATALOGUE[0], [line("a", 4)], reg).issues.some((i) => i.code === "CONFIG_INACTIVE"));
    assert.ok(previewCarton(cfg({ eligiblePackingGroups: [], mixablePackingGroupSets: [] }), [line("a", 4)], reg).issues.some((i) => i.code === "NO_VERIFIED_GROUPS"));
    assert.ok(previewCarton(cfg(), [line("a", 2), line("a", 2)], reg).issues.some((i) => i.code === "DUPLICATE_PRODUCT"));
    assert.ok(previewCarton(cfg(), [line("a", 1.5)], reg).issues.some((i) => i.code === "INVALID_QUANTITY"));
    assert.ok(previewCarton(cfg(), [line("a", -1)], reg).issues.some((i) => i.code === "INVALID_QUANTITY"));
    assert.equal(previewCarton(cfg(), [line("a", 5)], reg).physicallyComplete, false);
  });
  it("accounts for multi-slot SKUs and recommends only exact completions", () => {
    const reg = registry(profile("big", { slotsPerUnit: 2 }), profile("small"));
    const p = previewCarton(cfg(), [line("big", 1)], reg);
    assert.equal(p.filledSlots, 2);
    assert.equal(unitsToComplete(p, profile("big", { slotsPerUnit: 2 })), 1);
    assert.equal(unitsToComplete(p, profile("x", { slotsPerUnit: 3 })), null);
    assert.equal(unitsToComplete(previewCarton(cfg(), [line("small", 4)], reg), profile("small")), null);
  });
});

describe("planCartons", () => {
  it("splits quantities across cartons without changing totals", () => {
    const reg = registry(profile("a"));
    const plan = planCartons(cfg(), [line("a", 10)], reg);
    assert.deepEqual(plan.cartons.map((c) => c.filledSlots), [4, 4, 2]);
    assert.equal(plan.cartons.filter((c) => c.physicallyComplete).length, 2);
    assert.equal(plan.cartons.flatMap((c) => c.allocations).reduce((n, a) => n + a.quantity, 0), 10);
    assert.deepEqual(plan.unplaceable, []);
  });
  it("mixes verified groups, separates unverified mixes and reports unplaceable SKUs", () => {
    const reg = registry(profile("a"), profile("b", { packingGroup: "tray-b" }));
    const mixed = planCartons(cfg(), [line("a", 2), line("b", 2)], reg);
    assert.equal(mixed.cartons.length, 1);
    assert.equal(mixed.cartons[0].physicallyComplete, true);
    const apart = planCartons(cfg({ mixablePackingGroupSets: [] }), [line("a", 2), line("b", 2)], reg);
    assert.equal(apart.cartons.length, 2);
    assert.ok(apart.cartons.every((c) => c.physicallyValid && !c.physicallyComplete));
    const unknown = planCartons(cfg(), [line("a", 4), line("ghost", 1)], reg);
    assert.equal(unknown.cartons.length, 1);
    assert.equal(unknown.unplaceable[0].productId, "ghost");
  });
  it("does not emit a phantom empty carton when an oversized SKU cannot fit", () => {
    const reg = registry(profile("oversized", { slotsPerUnit: 5 }), profile("small"));
    const onlyOversized = planCartons(cfg(), [line("oversized", 1)], reg);
    assert.deepEqual(onlyOversized.cartons, []);
    assert.deepEqual(onlyOversized.unplaceable.map((i) => i.code), ["CAPACITY_EXCEEDED"]);

    const mixed = planCartons(cfg(), [line("small", 4), line("oversized", 2)], reg);
    assert.deepEqual(mixed.cartons.map((c) => c.filledSlots), [4]);
    assert.equal(mixed.unplaceable.length, 1);
    assert.equal(mixed.unplaceable[0].productId, "oversized");
  });
  it("is deterministic and reports duplicates and oversized units", () => {
    const reg = registry(profile("a"), profile("b", { packingGroup: "tray-b" }), profile("huge", { slotsPerUnit: 5 }));
    assert.deepEqual(planCartons(cfg(), [line("b", 3), line("a", 3)], reg), planCartons(cfg(), [line("a", 3), line("b", 3)], reg));
    assert.ok(planCartons(cfg(), [line("a", 1), line("a", 1)], reg).unplaceable.some((i) => i.code === "DUPLICATE_PRODUCT"));
    assert.ok(planCartons(cfg(), [line("huge", 1)], reg).unplaceable.length > 0);
  });
});
