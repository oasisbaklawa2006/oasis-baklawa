import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INITIAL_CARTON_CATALOGUE, type CartonConfiguration, type SkuPackingProfile } from "./carton-builder";
import { CARTON_GEOMETRIES, occupiedForFrame, resolveGeometry } from "./carton-geometry";
import { buildCartonViewModels, getCartonSupport, selectCartonConfigId, type CartonSupport } from "./carton-profile-source";
import { renderCartonSvg } from "./carton-svg";
import type { BuyerProductPrice, CustomerOrderDraft } from "../types/database.types";

/**
 * Catalogue → quantity → carton selection → Carton Builder → cart validation, on isolated fixtures.
 * Configurations are activated only inside this test's own copies; the shipped catalogue stays inactive.
 */
const asOf = new Date("2026-10-31T00:00:00Z");
const uomFor = (c: CartonConfiguration) => (c.innerPack === "box" ? "box" : "tray");
const activeCopy = (id: string): CartonConfiguration => ({ ...INITIAL_CARTON_CATALOGUE.find((c) => c.id === id)!, active: true, eligiblePackingGroups: ["g"], mixablePackingGroupSets: [] });
const profile = (c: CartonConfiguration, productId = "p1"): SkuPackingProfile => ({ productId, packingGroup: "g", slotsPerUnit: 1, commercialUom: uomFor(c), cartonConfigIds: [c.id] });
const price = (c: CartonConfiguration, productId = "p1", over: Partial<BuyerProductPrice> = {}): BuyerProductPrice => ({
  product_id: productId, selling_price: 100, currency: "INR", uom: uomFor(c), gst_rate: 5, tax_inclusive: true, applied_discount_percent: null,
  minimum_order_quantity: 1, minimum_order_uom: uomFor(c), order_increment: 1, order_increment_uom: uomFor(c), valid_from: null, valid_until: null, ...over,
});
const draft = (qty: number, productId = "p1"): CustomerOrderDraft => ({ lines: [{ product_id: productId, quantity: qty }] } as unknown as CustomerOrderDraft);
const support = (c: CartonConfiguration, profiles: SkuPackingProfile[]): CartonSupport => ({ available: true, catalogue: [c], profiles: new Map(profiles.map((p) => [p.productId, p])) });

for (const id of ["888x4", "bulk-6", "bulk-10"]) {
  describe(`journey — ${id}`, () => {
    const c = activeCopy(id);
    const g = CARTON_GEOMETRIES.find((x) => x.id === id)!;

    it("every quantity 1..capacity selects the configuration, fills exactly that many slots and matches the rendered frame", () => {
      for (let q = 1; q <= c.capacity; q++) {
        const s = support(c, [profile(c)]);
        assert.equal(selectCartonConfigId(draft(q), s, asOf), id);
        const [vm] = buildCartonViewModels(draft(q), s, id, { p1: price(c) }, asOf);
        assert.equal(vm.preview.filledSlots, q);
        assert.equal(vm.preview.capacity, c.capacity);
        assert.equal(vm.preview.physicallyComplete, q === c.capacity);
        // Placement sequence: the renderer draws exactly the first q trays in insertion order.
        const occupied = g.insertionOrder.slice(0, q);
        assert.deepEqual(occupied, occupiedForFrame(g, q + 1));
        const svg = renderCartonSvg(g, occupied, "open");
        assert.equal((svg.match(/<g id="tray-/g) || []).length, q);
        for (let i = 0; i < q; i++) assert.ok(svg.includes(`id="tray-${i + 1}"`));
      }
    });

    it("splits an over-capacity quantity into whole cartons without changing the customer quantity", () => {
      const q = c.capacity + 3; const d = draft(q); const s = support(c, [profile(c)]);
      const vms = buildCartonViewModels(d, s, id, { p1: price(c) }, asOf);
      assert.equal(vms.length, 2);
      assert.equal(vms[0].preview.filledSlots, c.capacity);
      assert.equal(vms[1].preview.filledSlots, 3);
      assert.equal(d.lines[0].quantity, q);
    });

    it("MOQ and increment are evaluated on the whole line and never alter it", () => {
      const s = support(c, [profile(c)]);
      const [vm] = buildCartonViewModels(draft(c.capacity), s, id, { p1: price(c, "p1", { minimum_order_quantity: c.capacity + 2 }) }, asOf);
      assert.equal(vm.preview.physicallyComplete, true);
      assert.equal(vm.commercial.commercialValid, false);
      assert.equal(vm.commercial.clientPrecheckPassed, false);
      assert.equal(vm.commercial.lines[0].quantity, c.capacity);
    });

    it("a full carton at valid MOQ passes only the client pre-check (Core still decides)", () => {
      const s = support(c, [profile(c)]);
      const [vm] = buildCartonViewModels(draft(c.capacity), s, id, { p1: price(c) }, asOf);
      assert.equal(vm.commercial.clientPrecheckPassed, true);
    });

    it("the shipped catalogue is inactive and the live seam shows nothing", () => {
      assert.equal(INITIAL_CARTON_CATALOGUE.find((x) => x.id === id)!.active, false);
      assert.equal(getCartonSupport().available, false);
      assert.deepEqual(buildCartonViewModels(draft(1), getCartonSupport(), id, { p1: price(c) }, asOf), []);
      assert.equal(selectCartonConfigId(draft(1), getCartonSupport(), asOf), null);
    });

    it("an inactive configuration is never selected, even with verified profiles", () => {
      const inactive: CartonConfiguration = { ...c, active: false };
      const s = support(inactive, [profile(c)]);
      assert.equal(selectCartonConfigId(draft(1), s, asOf), null);
      assert.deepEqual(buildCartonViewModels(draft(1), s, id, { p1: price(c) }, asOf), []);
    });

    it("an unverified SKU, a unit mismatch or an unsupported combination yields no carton view", () => {
      assert.equal(selectCartonConfigId(draft(2, "unknown"), support(c, [profile(c)]), asOf), null);
      const wrongUom = buildCartonViewModels(draft(c.capacity), support(c, [profile(c)]), id, { p1: price(c, "p1", { uom: "kg", minimum_order_uom: "kg", order_increment_uom: "kg" }) }, asOf);
      assert.equal(wrongUom[0]?.commercial.clientPrecheckPassed ?? false, false);
      const otherConfigOnly: SkuPackingProfile = { ...profile(c), cartonConfigIds: ["not-this-carton"] };
      assert.equal(selectCartonConfigId(draft(1), support(c, [otherConfigOnly]), asOf), null);
    });

    it("the production resolver refuses the pending geometry; the review seam resolves it", () => {
      assert.equal(resolveGeometry(id, c.capacity), undefined);
      assert.ok(resolveGeometry(id, c.capacity, true));
    });

    it("re-evaluating after an edit yields a fresh, consistent result (no stale state)", () => {
      const s = support(c, [profile(c)]);
      const before = buildCartonViewModels(draft(2), s, id, { p1: price(c) }, asOf)[0].preview.filledSlots;
      const after = buildCartonViewModels(draft(3), s, id, { p1: price(c) }, asOf)[0].preview.filledSlots;
      const again = buildCartonViewModels(draft(2), s, id, { p1: price(c) }, asOf)[0].preview.filledSlots;
      assert.deepEqual([before, after, again], [2, 3, 2]);
    });
  });
}

describe("mixed lines never duplicate or drop items", () => {
  it("two SKUs share a carton, total slots equal the sum, and each line keeps its quantity", () => {
    const c = activeCopy("bulk-6");
    const s = support(c, [profile(c, "a"), profile(c, "b")]);
    const d = { lines: [{ product_id: "a", quantity: 2 }, { product_id: "b", quantity: 3 }] } as unknown as CustomerOrderDraft;
    const vms = buildCartonViewModels(d, s, "bulk-6", { a: price(c, "a"), b: price(c, "b") }, asOf);
    const total = vms.reduce((n, v) => n + v.preview.filledSlots, 0);
    assert.equal(total, 5);
    assert.deepEqual(d.lines.map((l) => l.quantity), [2, 3]);
  });
});
