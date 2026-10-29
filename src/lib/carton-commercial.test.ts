import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INITIAL_CARTON_CATALOGUE, previewCarton, type CartonConfiguration, type SkuPackingProfile } from "./carton-builder";
import { evaluateCartonCommercial } from "./carton-commercial";
import { buildCartonViewModels, getCartonSupport, selectCartonConfigId, type CartonSupport } from "./carton-profile-source";
import { describeCarton } from "./carton-presentation";
import type { BuyerProductPrice, CustomerOrderDraft } from "../types/database.types";

const config: CartonConfiguration = { ...INITIAL_CARTON_CATALOGUE[0], active: true, eligiblePackingGroups: ["g"], mixablePackingGroupSets: [] };
const profile = (productId: string, over: Partial<SkuPackingProfile> = {}): SkuPackingProfile => ({ productId, packingGroup: "g", slotsPerUnit: 1, commercialUom: "tray", cartonConfigIds: ["888x4"], ...over });
const price = (productId: string, over: Partial<BuyerProductPrice> = {}): BuyerProductPrice => ({
  product_id: productId, selling_price: 100, currency: "INR", uom: "tray", gst_rate: 5, tax_inclusive: true, applied_discount_percent: null,
  minimum_order_quantity: 2, minimum_order_uom: "tray", order_increment: 1, order_increment_uom: "tray", valid_from: null, valid_until: null, ...over,
});
const reg = (...p: SkuPackingProfile[]) => new Map(p.map((x) => [x.productId, x]));
const asOf = new Date("2026-10-30T00:00:00Z");

describe("physical completeness is separate from commercial validity", () => {
  it("full carton with quantity below MOQ: physically complete, commercially invalid, no precheck pass", () => {
    const profiles = reg(profile("a"));
    const lines = [{ productId: "a", quantity: 4 }];
    const preview = previewCarton(config, lines, profiles);
    const report = evaluateCartonCommercial(preview, lines, { a: price("a", { minimum_order_quantity: 6 }) }, profiles, asOf);
    assert.equal(preview.physicallyComplete, true);
    assert.equal(report.commercialValid, false);
    assert.equal(report.clientPrecheckPassed, false);
    assert.equal(report.lines[0].validation.code, "QUANTITY_BELOW_MOQ");
  });
  it("partially filled carton with a valid SKU quantity: commercially valid, not complete", () => {
    const profiles = reg(profile("a"));
    const lines = [{ productId: "a", quantity: 2 }];
    const preview = previewCarton(config, lines, profiles);
    const report = evaluateCartonCommercial(preview, lines, { a: price("a") }, profiles, asOf);
    assert.equal(report.commercialValid, true);
    assert.equal(report.physicallyComplete, false);
    assert.equal(report.clientPrecheckPassed, false);
  });
  it("exact MOQ and correct increment on a complete carton passes the client precheck (Core still decides)", () => {
    const profiles = reg(profile("a"));
    const lines = [{ productId: "a", quantity: 4 }];
    const report = evaluateCartonCommercial(previewCarton(config, lines, profiles), lines, { a: price("a", { minimum_order_quantity: 2, order_increment: 2 }) }, profiles, asOf);
    assert.equal(report.clientPrecheckPassed, true);
    assert.equal(lines[0].quantity, 4);
  });
  it("incorrect increment blocks without altering the quantity", () => {
    const profiles = reg(profile("a"));
    const lines = [{ productId: "a", quantity: 3 }];
    const report = evaluateCartonCommercial(previewCarton(config, lines, profiles), lines, { a: price("a", { minimum_order_quantity: 2, order_increment: 2 }) }, profiles, asOf);
    assert.equal(report.lines[0].validation.code, "QUANTITY_INCREMENT_MISMATCH");
    assert.equal(report.lines[0].quantity, 3);
  });
  it("missing price, expired price and missing commercial data fail closed", () => {
    const profiles = reg(profile("a"));
    const lines = [{ productId: "a", quantity: 4 }];
    const preview = previewCarton(config, lines, profiles);
    assert.equal(evaluateCartonCommercial(preview, lines, {}, profiles, asOf).lines[0].validation.code, "PRICE_UNAVAILABLE");
    assert.equal(evaluateCartonCommercial(preview, lines, { a: price("a", { valid_until: "2026-01-01T00:00:00Z" }) }, profiles, asOf).lines[0].validation.code, "PRICE_EXPIRED");
    assert.equal(evaluateCartonCommercial(preview, lines, { a: price("a", { minimum_order_quantity: null }) }, profiles, asOf).lines[0].validation.code, "MOQ_UNRESOLVED");
    assert.equal(evaluateCartonCommercial(preview, lines, { a: price("a", { order_increment: null }) }, profiles, asOf).clientPrecheckPassed, false);
  });
  it("different UOMs between price and packing profile block the carton precheck", () => {
    const profiles = reg(profile("a", { commercialUom: "tray" }));
    const lines = [{ productId: "a", quantity: 4 }];
    const report = evaluateCartonCommercial(previewCarton(config, lines, profiles), lines, { a: price("a", { uom: "kg" }) }, profiles, asOf);
    assert.ok(report.blockers.some((b) => b.code === "UOM_MISMATCH"));
    assert.equal(report.clientPrecheckPassed, false);
  });
  it("mixed variants with differing minima validate each SKU independently", () => {
    const cfg2 = { ...config, eligiblePackingGroups: ["g", "h"], mixablePackingGroupSets: [["g", "h"]] };
    const profiles = reg(profile("a"), profile("b", { packingGroup: "h" }));
    const lines = [{ productId: "a", quantity: 2 }, { productId: "b", quantity: 2 }];
    const preview = previewCarton(cfg2, lines, profiles);
    const report = evaluateCartonCommercial(preview, lines, { a: price("a", { minimum_order_quantity: 2 }), b: price("b", { minimum_order_quantity: 3 }) }, profiles, asOf);
    assert.equal(preview.physicallyComplete, true);
    assert.deepEqual(report.lines.map((l) => l.validation.orderable), [true, false]);
    assert.equal(report.clientPrecheckPassed, false);
  });
});

describe("cart integration seam and presentation", () => {
  const draft = { draft_id: "d", company_id: "c", status: "active", readiness_status: "blocked", readiness_issues: [], order_total: 0, is_checkout_ready: false,
    lines: [{ line_id: "l1", product_id: "a", quantity: 4, unit_price_snapshot: 1, currency_snapshot: "INR", uom_snapshot: "tray", sku_snapshot: "A", product_name_snapshot: "A", line_total: 4 }] } as unknown as CustomerOrderDraft;
  it("renders nothing while verified packing data is unavailable (external dependency)", () => {
    const support = getCartonSupport();
    assert.equal(support.available, false);
    assert.equal(selectCartonConfigId(draft, support), null);
    assert.deepEqual(buildCartonViewModels(draft, support, "888x4", {}), []);
  });
  it("builds advisory view models from verified support and never sets checkout readiness", () => {
    const support: CartonSupport = { available: true, catalogue: [config], profiles: reg(profile("a")) };
    assert.equal(selectCartonConfigId(draft, support), "888x4");
    const [vm] = buildCartonViewModels(draft, support, "888x4", { a: price("a", { minimum_order_quantity: 2 }) }, asOf);
    assert.equal(vm.preview.physicallyComplete, true);
    assert.equal(draft.is_checkout_ready, false);
  });
  it("uses courteous, specific wording", () => {
    const profiles = reg(profile("a"));
    const partial = describeCarton(previewCarton(config, [{ productId: "a", quantity: 1 }], profiles), "tray");
    assert.equal(partial.progressLabel, "1 of 4");
    assert.match(partial.guidance[0], /3 trays of a compatible product would complete this carton/);
    const sealed = describeCarton(previewCarton(config, [{ productId: "a", quantity: 4 }], profiles), "tray");
    assert.equal(sealed.sealedIllustration, true);
    assert.match(sealed.guidance[0], /illustration/);
    const bad = describeCarton(previewCarton(config, [{ productId: "zzz", quantity: 1 }], profiles), "tray");
    assert.match(bad.headline, /adjustment/);
  });
});
