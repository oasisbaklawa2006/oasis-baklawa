import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadCartonSupportFromCore, type CoreRpc } from "./carton-support-loader";
import { buildCartonViewModels, selectCartonConfigId } from "./carton-profile-source";
import type { BuyerProductPrice, CustomerOrderDraft } from "../types/database.types";

const NOW = new Date("2026-10-31T00:00:00Z");
const cfg = (over: Record<string, unknown> = {}) => ({ contract_version: 1, config_id: "888x4", config_version: 1, label: "Type A", family: "bulk_sweets", capacity_slots: 4, inner_pack: "tray", slot_columns: null, slot_rows: null, eligible_packing_groups: ["g"], mixable_group_sets: [], visual_asset_keys: null, asset_status: "pending", effective_from: null, effective_until: null, approval_status: "approved", ...over });
const prof = (over: Record<string, unknown> = {}) => ({ contract_version: 1, product_id: "p1", sku: "S1", variant_id: null, packing_group: "g", conversion_basis: "slot_unit", slots_per_unit: 1, commercial_uom: "tray", carton_config_ids: ["888x4"], requires_separate_carton: false, mix_allowed: true, full_carton_required: true, profile_version: 1, approval_status: "approved", effective_from: null, effective_until: null, projection_hash: "h", ...over });
const price = (over: Partial<BuyerProductPrice> = {}): BuyerProductPrice => ({ product_id: "p1", selling_price: 100, currency: "INR", uom: "tray", gst_rate: 5, tax_inclusive: true, applied_discount_percent: null, minimum_order_quantity: 2, minimum_order_uom: "tray", order_increment: 1, order_increment_uom: "tray", valid_from: null, valid_until: null, ...over });
const rpcOf = (c: unknown, p: unknown): CoreRpc => async (name) => ({ data: name === "buyer_carton_configurations_v1" ? c : p, error: null });
const draft = (q: number) => ({ lines: [{ product_id: "p1", quantity: q }] } as unknown as CustomerOrderDraft);

describe("Core packing-profile adapter", () => {
  it("builds carton support from contract rows and drives selection and previews", async () => {
    const { support, issues } = await loadCartonSupportFromCore(rpcOf([cfg()], [prof()]), [price()], NOW);
    assert.equal(support.available, true); assert.deepEqual(issues, []);
    assert.equal(selectCartonConfigId(draft(3), support, NOW), "888x4");
    assert.equal(buildCartonViewModels(draft(3), support, "888x4", { p1: price() }, NOW)[0].preview.filledSlots, 3);
  });
  it("fails closed when the RPCs are missing, error, throw or return junk", async () => {
    const missing: CoreRpc = async () => ({ data: null, error: { code: "PGRST202", message: "function not found" } });
    const denied: CoreRpc = async () => ({ data: null, error: { code: "42501", message: "permission denied" } });
    const boom: CoreRpc = async () => { throw new Error("network"); };
    assert.equal((await loadCartonSupportFromCore(missing, [price()], NOW)).reason, "rpc_missing");
    assert.equal((await loadCartonSupportFromCore(denied, [price()], NOW)).reason, "rpc_error");
    assert.equal((await loadCartonSupportFromCore(boom, [price()], NOW)).reason, "rpc_error");
    for (const bad of [await loadCartonSupportFromCore(rpcOf({}, []), [price()], NOW), await loadCartonSupportFromCore(rpcOf([cfg({ contract_version: 2 })], [prof()]), [price()], NOW)]) {
      assert.equal(bad.support.available, false); assert.equal(bad.reason, "contract_rejected");
    }
  });
  it("never trusts unapproved or ineffective rows, and zero rows is unavailable-equivalent (no selection)", async () => {
    const r = await loadCartonSupportFromCore(rpcOf([cfg({ approval_status: "pending" })], [prof()]), [price()], NOW);
    assert.equal(selectCartonConfigId(draft(1), r.support, NOW), null);
    const empty = await loadCartonSupportFromCore(rpcOf([], []), [price()], NOW);
    assert.equal(selectCartonConfigId(draft(1), empty.support, NOW), null);
  });
  it("a unit mismatch with the price projection removes the product's carton support", async () => {
    const r = await loadCartonSupportFromCore(rpcOf([cfg()], [prof()]), [price({ uom: "kg" })], NOW);
    assert.equal(r.support.profiles.has("p1"), false);
    assert.ok(r.issues.includes("UOM_MISMATCH"));
  });
  it("version change: a re-fetch replaces the old profile, so a stale one cannot linger", async () => {
    const v1 = await loadCartonSupportFromCore(rpcOf([cfg()], [prof({ slots_per_unit: 1 })]), [price()], NOW);
    const v2 = await loadCartonSupportFromCore(rpcOf([cfg({ config_version: 2 })], [prof({ slots_per_unit: 2, profile_version: 2 })]), [price()], NOW);
    assert.equal(buildCartonViewModels(draft(2), v1.support, "888x4", { p1: price() }, NOW)[0].preview.filledSlots, 2);
    assert.equal(buildCartonViewModels(draft(2), v2.support, "888x4", { p1: price() }, NOW)[0].preview.filledSlots, 4);
  });
  it("MOQ failure and a partial carton block the client pre-check without changing the quantity; Core still decides", async () => {
    const { support } = await loadCartonSupportFromCore(rpcOf([cfg()], [prof()]), [price({ minimum_order_quantity: 4 })], NOW);
    const d = draft(3);
    const [vm] = buildCartonViewModels(d, support, "888x4", { p1: price({ minimum_order_quantity: 4 }) }, NOW);
    assert.equal(vm.preview.physicallyComplete, false);
    assert.equal(vm.commercial.clientPrecheckPassed, false);
    assert.equal(d.lines[0].quantity, 3);
    const full = buildCartonViewModels(draft(4), support, "888x4", { p1: price({ minimum_order_quantity: 4 }) }, NOW)[0];
    assert.equal(full.commercial.clientPrecheckPassed, true);
  });
});
