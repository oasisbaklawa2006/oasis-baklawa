import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CARTON_GEOMETRIES, occupiedForFrame, resolveGeometry } from "./carton-geometry";
import { buildCartonViewModels, selectCartonConfigId, type CartonSupport } from "./carton-profile-source";
import { normalizePackingContract } from "./packing-profile-contract";
import { renderCartonSvg } from "./carton-svg";
import type { BuyerProductPrice, CustomerOrderDraft } from "../types/database.types";

/**
 * CONTRACT-LEVEL integration against the PROPOSED Core packing-profile contract v1 (docs/carton-builder/CORE_PACKING_PROFILE_CONTRACT_SPEC.md).
 * Payloads are synthetic fixtures shaped like the specified RPC rows. This is NOT a live Core test: no such Core projection exists
 * (verified read-only against the live schema on 31 Oct 2026), so nothing here certifies an end-to-end authenticated journey.
 */
const NOW = new Date("2026-10-31T00:00:00Z");
const CONFIGS = [
  { id: "888x4", cap: 4, pack: "tray" }, { id: "bulk-6", cap: 6, pack: "box" }, { id: "bulk-10", cap: 10, pack: "tray" },
];
const cfgRow = (c: { id: string; cap: number; pack: string }) => ({
  contract_version: 1, config_id: c.id, config_version: 1, label: c.id, family: "bulk_sweets", capacity_slots: c.cap, inner_pack: c.pack,
  slot_columns: null, slot_rows: null, eligible_packing_groups: ["g"], mixable_group_sets: [], visual_asset_keys: null, asset_status: "pending",
  effective_from: null, effective_until: null, approval_status: "approved",
});
const profRow = (productId: string, cfgIds: string[], uom: string) => ({
  contract_version: 1, product_id: productId, sku: productId.toUpperCase(), variant_id: null, packing_group: "g", conversion_basis: "slot_unit", slots_per_unit: 1,
  commercial_uom: uom, carton_config_ids: cfgIds, requires_separate_carton: false, mix_allowed: true, full_carton_required: true, profile_version: 1,
  approval_status: "approved", effective_from: null, effective_until: null,
});
const price = (productId: string, uom: string): BuyerProductPrice => ({
  product_id: productId, selling_price: 100, currency: "INR", uom, gst_rate: 5, tax_inclusive: true, applied_discount_percent: null,
  minimum_order_quantity: 1, minimum_order_uom: uom, order_increment: 1, order_increment_uom: uom, valid_from: null, valid_until: null,
});
const draft = (qty: number) => ({ lines: [{ product_id: "p1", quantity: qty }] } as unknown as CustomerOrderDraft);

describe("Buyer consumes the proposed Core contract v1 correctly (fixtures, not live Core)", () => {
  for (const c of CONFIGS) {
    it(`${c.id}: contract rows → normalised support → carton selection → frame`, () => {
      const prices = new Map([["p1", c.pack === "box" ? "box" : "tray"]]);
      const r = normalizePackingContract([cfgRow(c)], [profRow("p1", [c.id], prices.get("p1")!)], { asOf: NOW, priceUomByProduct: prices });
      assert.deepEqual(r.issues, []);
      assert.equal(r.available, true);
      const support: CartonSupport = { available: r.available, catalogue: r.configs, profiles: r.profiles };
      for (const q of [1, Math.ceil(c.cap / 2), c.cap]) {
        assert.equal(selectCartonConfigId(draft(q), support, NOW), c.id);
        const [vm] = buildCartonViewModels(draft(q), support, c.id, { p1: price("p1", prices.get("p1")!) }, NOW);
        assert.equal(vm.preview.filledSlots, q);
        const g = CARTON_GEOMETRIES.find((x) => x.id === c.id)!;
        assert.equal(g.capacity, c.cap);
        const svg = renderCartonSvg(g, occupiedForFrame(g, q + 1), "open");
        assert.equal((svg.match(/<g id="tray-/g) || []).length, q);
        assert.ok(resolveGeometry(c.id, c.cap, true));
        assert.equal(resolveGeometry(c.id, c.cap), undefined, "production resolver still refuses pending geometry");
      }
    });
    it(`${c.id}: a unit mismatch between profile and price fails closed (no carton view)`, () => {
      const r = normalizePackingContract([cfgRow(c)], [profRow("p1", [c.id], "tray")], { asOf: NOW, priceUomByProduct: new Map([["p1", "kg"]]) });
      assert.equal(r.profiles.size, 0);
      assert.ok(r.issues.some((i) => i.code === "UOM_MISMATCH"));
    });
  }
  it("an unknown contract version, a non-array payload and unapproved rows never produce carton support", () => {
    assert.equal(normalizePackingContract([{ ...cfgRow(CONFIGS[0]), contract_version: 2 }], [], { asOf: NOW }).available, false);
    assert.equal(normalizePackingContract(null, [], { asOf: NOW }).available, false);
    const r = normalizePackingContract([{ ...cfgRow(CONFIGS[0]), approval_status: "pending" }], [], { asOf: NOW });
    assert.equal(r.configs.length, 0);
  });
});
