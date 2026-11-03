import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLatestOnly, fetchCartonSupport } from "./carton-core-binding";
import { buildCartonViewModels, selectCartonConfigId } from "./carton-profile-source";
import type { CoreRpc } from "./carton-support-loader";
import type { BuyerProductPrice, CustomerOrderDraft } from "../types/database.types";

const NOW = new Date("2026-10-31T00:00:00Z");
const cfg = { contract_version: 1, config_id: "bulk-10", config_version: 1, label: "RTC", family: "bulk_sweets", capacity_slots: 10, inner_pack: "tray", slot_columns: null, slot_rows: null, eligible_packing_groups: ["g"], mixable_group_sets: [], visual_asset_keys: null, asset_status: "pending", effective_from: null, effective_until: null, approval_status: "approved" };
const prof = (over: Record<string, unknown> = {}) => ({ contract_version: 1, product_id: "p1", sku: "S1", variant_id: null, packing_group: "g", conversion_basis: "slot_unit", slots_per_unit: 1, commercial_uom: "tray", carton_config_ids: ["bulk-10"], requires_separate_carton: false, mix_allowed: true, full_carton_required: true, profile_version: 1, approval_status: "approved", effective_from: null, effective_until: null, projection_hash: "h", ...over });
const price: BuyerProductPrice = { product_id: "p1", selling_price: 100, currency: "INR", uom: "tray", gst_rate: 5, tax_inclusive: true, applied_discount_percent: null, minimum_order_quantity: 1, minimum_order_uom: "tray", order_increment: 1, order_increment_uom: "tray", valid_from: null, valid_until: null };
const draft = (q: number) => ({ lines: [{ product_id: "p1", quantity: q }] } as unknown as CustomerOrderDraft);
const okRpc = (p: unknown = [prof()]): CoreRpc => async (n) => ({ data: n === "buyer_carton_configurations_v1" ? [cfg] : p, error: null });

describe("cart binding to the Core projections", () => {
  it("makes no request at all while the release flag is off (Core not yet published)", async () => {
    let calls = 0;
    const rpc: CoreRpc = async () => { calls++; return { data: [], error: null }; };
    const r = await fetchCartonSupport([price], { rpc, enabled: false, asOf: NOW });
    assert.equal(calls, 0); assert.equal(r.support.available, false);
  });
  it("with the flag on, an authenticated buyer's rows drive selection and the preview; the draft quantity is untouched", async () => {
    const r = await fetchCartonSupport([price], { rpc: okRpc(), enabled: true, asOf: NOW });
    assert.equal(r.support.available, true);
    const d = draft(7);
    assert.equal(selectCartonConfigId(d, r.support, NOW), "bulk-10");
    assert.equal(buildCartonViewModels(d, r.support, "bulk-10", { p1: price }, NOW)[0].preview.filledSlots, 7);
    assert.equal(d.lines[0].quantity, 7);
  });
  it("permission denied, missing function and thrown errors all fail closed", async () => {
    for (const [code, expect] of [["42501", "rpc_error"], ["PGRST202", "rpc_missing"]] as const) {
      const rpc: CoreRpc = async () => ({ data: null, error: { code, message: "x" } });
      const r = await fetchCartonSupport([price], { rpc, enabled: true, asOf: NOW });
      assert.equal(r.support.available, false); assert.equal(r.reason, expect);
    }
  });
  it("a deactivated carton (no approved rows served) leaves no carton to select", async () => {
    const rpc: CoreRpc = async () => ({ data: [], error: null });
    const r = await fetchCartonSupport([price], { rpc, enabled: true, asOf: NOW });
    assert.equal(selectCartonConfigId(draft(3), r.support, NOW), null);
  });
  it("a stale profile cannot linger: the unit-mismatched or re-versioned profile is judged against current prices", async () => {
    const r = await fetchCartonSupport([{ ...price, uom: "kg" }], { rpc: okRpc(), enabled: true, asOf: NOW });
    assert.equal(r.support.profiles.has("p1"), false);
  });
  it("only the latest request may publish (a slow stale response is ignored)", () => {
    const g = createLatestOnly();
    const first = g.begin(); const second = g.begin();
    assert.equal(first(), false); assert.equal(second(), true);
    g.cancel(); assert.equal(second(), false);
  });
});
