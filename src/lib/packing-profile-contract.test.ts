import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planCartons, previewCarton, resolveCartonConfiguration } from "./carton-builder";
import { normalizePackingContract, PACKING_CONTRACT_VERSION } from "./packing-profile-contract";

const NOW = new Date("2026-10-30T00:00:00Z");
const config = (over: Record<string, unknown> = {}) => ({
  contract_version: 1, config_id: "888x4", config_version: 1, label: "Type A", family: "bulk_sweets", capacity_slots: 4,
  inner_pack: "tray", slot_columns: null, slot_rows: null, eligible_packing_groups: ["g1", "g2"], mixable_group_sets: [["g1", "g2"]],
  visual_asset_keys: null, asset_status: "pending", effective_from: null, effective_until: null, approval_status: "approved", ...over,
});
const profile = (over: Record<string, unknown> = {}) => ({
  contract_version: 1, product_id: "p1", sku: "S1", variant_id: null, packing_group: "g1", conversion_basis: "slot_unit", slots_per_unit: 1,
  commercial_uom: "tray", carton_config_ids: ["888x4"], requires_separate_carton: false, mix_allowed: true, full_carton_required: true,
  profile_version: 1, approval_status: "approved", effective_from: null, effective_until: null, ...over,
});
const run = (c: unknown[], p: unknown[]) => normalizePackingContract(c, p, { asOf: NOW });
const codes = (r: ReturnType<typeof run>) => r.issues.map((i) => i.code);

describe("packing-profile contract validator (fail closed)", () => {
  it("accepts a fully valid payload and feeds the carton engine", () => {
    const r = run([config()], [profile(), profile({ product_id: "p2", packing_group: "g2" })]);
    assert.equal(r.available, true);
    assert.deepEqual(r.issues, []);
    const cfg = resolveCartonConfiguration(r.configs, "888x4", NOW);
    assert.ok(cfg);
    const preview = previewCarton(cfg!, [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 2 }], r.profiles);
    assert.equal(preview.physicallyComplete, true);
    assert.equal(planCartons(cfg!, [{ productId: "p1", quantity: 6 }], r.profiles).cartons.length, 2);
  });
  it("rejects non-array payloads and unknown or missing contract versions wholesale", () => {
    assert.deepEqual(codes(normalizePackingContract(null, [], { asOf: NOW })), ["NOT_AN_ARRAY"]);
    assert.deepEqual(codes(normalizePackingContract([], {}, { asOf: NOW })), ["NOT_AN_ARRAY"]);
    for (const bad of [run([config({ contract_version: 2 })], [profile()]), run([config()], [profile({ contract_version: "1" })])]) {
      assert.equal(bad.available, false);
      assert.equal(bad.configs.length + bad.profiles.size, 0);
      assert.deepEqual(codes(bad), ["CONTRACT_VERSION_UNSUPPORTED"]);
    }
    const missing: Record<string, unknown> = profile();
    delete missing.contract_version;
    assert.deepEqual(codes(run([config()], [missing])), ["CONTRACT_VERSION_UNSUPPORTED"]);
    assert.equal(PACKING_CONTRACT_VERSION, 1);
  });
  it("rejects only the bad row and keeps others", () => {
    const r = run([config()], [profile(), profile({ product_id: "bad", slots_per_unit: 1.5 }), "oops", null]);
    assert.equal(r.profiles.has("p1"), true);
    assert.equal(r.profiles.has("bad"), false);
    assert.ok(codes(r).includes("FIELD_INVALID"));
    assert.ok(codes(r).filter((c) => c === "ROW_NOT_AN_OBJECT").length === 2);
  });
  it("rejects invalid slot counts, empty groups, blank uom and missing fields", () => {
    for (const bad of [{ slots_per_unit: 0 }, { slots_per_unit: -1 }, { slots_per_unit: "2" }, { slots_per_unit: 2 ** 60 }, { packing_group: " " }, { commercial_uom: "" }, { carton_config_ids: [] }, { carton_config_ids: [""] }, { profile_version: 0 }, { product_id: "" }, { mix_allowed: "yes" }]) {
      const r = run([config()], [profile(bad)]);
      assert.equal(r.profiles.size, 0, JSON.stringify(bad));
      assert.equal(r.available, false);
    }
  });
  it("rejects unapproved and out-of-window rows", () => {
    for (const status of ["draft", "pending", "rejected", undefined]) {
      assert.equal(run([config()], [profile({ approval_status: status })]).profiles.size, 0);
      assert.equal(run([config({ approval_status: status })], [profile()]).configs.length, 0);
    }
    assert.deepEqual(codes(run([config()], [profile({ effective_from: "2030-01-01T00:00:00Z" })])), ["NOT_EFFECTIVE"]);
    assert.deepEqual(codes(run([config()], [profile({ effective_until: "2020-01-01T00:00:00Z" })])), ["NOT_EFFECTIVE"]);
    assert.deepEqual(codes(run([config()], [profile({ effective_from: "not-a-date" })])), ["FIELD_INVALID"]);
    assert.equal(run([config({ effective_until: "2020-01-01T00:00:00Z" })], [profile()]).available, false);
  });
  it("rejects variants, unsupported conversions and exclusive-carton SKUs the engine cannot honour", () => {
    assert.deepEqual(codes(run([config()], [profile({ variant_id: "v1" })])), ["VARIANT_UNSUPPORTED"]);
    assert.deepEqual(codes(run([config()], [profile({ conversion_basis: "fixed_ratio", ordered_units_per_slot: 2.5 })])), ["UNSUPPORTED_CONVERSION"]);
    assert.deepEqual(codes(run([config()], [profile({ requires_separate_carton: true, mix_allowed: false })])), ["ENGINE_RULE_UNSUPPORTED"]);
    assert.deepEqual(codes(run([config()], [profile({ mix_allowed: false })])), ["ENGINE_RULE_UNSUPPORTED"]);
    assert.deepEqual(codes(run([config()], [profile({ requires_separate_carton: true, mix_allowed: true })])), ["RULE_CONFLICT"]);
  });
  it("rejects every copy of a duplicated product or configuration as ambiguous", () => {
    const dupP = run([config()], [profile(), profile(), profile({ product_id: "p2" })]);
    assert.equal(dupP.profiles.has("p1"), false);
    assert.equal(dupP.profiles.has("p2"), true);
    assert.equal(codes(dupP).filter((c) => c === "DUPLICATE_PROFILE").length, 1);
    const dupC = run([config(), config()], [profile()]);
    assert.equal(dupC.configs.length, 0);
    assert.equal(dupC.available, false);
    assert.equal(codes(dupC).filter((c) => c === "DUPLICATE_CONFIG").length, 1);
  });
  it("drops unknown config references and rejects profiles left with none", () => {
    const partial = run([config()], [profile({ carton_config_ids: ["888x4", "ghost"] })]);
    assert.deepEqual(partial.profiles.get("p1")?.cartonConfigIds, ["888x4"]);
    const none = run([config()], [profile({ carton_config_ids: ["ghost"] })]);
    assert.deepEqual(codes(none), ["NO_VALID_CONFIG"]);
    assert.equal(none.available, false);
  });
  it("validates configuration rules: capacity, arrangement, mixable sets, assets", () => {
    assert.equal(run([config({ capacity_slots: 0 })], [profile()]).configs.length, 0);
    assert.equal(run([config({ capacity_slots: 2.5 })], [profile()]).configs.length, 0);
    assert.equal(run([config({ slot_columns: 3, slot_rows: 2 })], [profile()]).configs.length, 0);
    assert.equal(run([config({ slot_columns: 2, slot_rows: null })], [profile()]).configs.length, 0);
    assert.deepEqual(run([config({ slot_columns: 2, slot_rows: 2 })], [profile()]).configs[0].slotArrangement, { columns: 2, rows: 2 });
    assert.deepEqual(codes(run([config({ mixable_group_sets: [["g1", "ghost"]] })], [profile()])), ["RULE_CONFLICT", "NO_VALID_CONFIG"]);
    assert.equal(run([config({ mixable_group_sets: "x" })], [profile()]).configs.length, 0);
    assert.equal(run([config({ mixable_group_sets: [[]] })], [profile()]).configs.length, 0);
    assert.equal(run([config({ asset_status: "weird" })], [profile()]).configs.length, 0);
    assert.equal(run([config({ visual_asset_keys: { sealed: "" } })], [profile()]).configs.length, 0);
    assert.equal(run([config({ eligible_packing_groups: "g1" })], [profile()]).configs.length, 0);
  });
  it("supports arbitrary future capacities", () => {
    const r = run([config({ config_id: "x24", capacity_slots: 24, slot_columns: 6, slot_rows: 4 })], [profile({ carton_config_ids: ["x24"] })]);
    assert.equal(r.configs[0].capacity, 24);
    assert.equal(r.available, true);
  });
  it("never throws on hostile input", () => {
    for (const junk of [undefined, 5, "x", {}, [[]], [null], [undefined], [{ __proto__: { product_id: "p" } }]]) {
      assert.doesNotThrow(() => normalizePackingContract(junk, junk, { asOf: NOW }));
    }
    assert.equal(run([config()], [profile({ product_id: "__proto__" })]).profiles.has("__proto__"), true);
  });
});
