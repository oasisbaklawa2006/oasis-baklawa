import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FULFILMENT_TIMELINE_STAGES,
  buyerFulfilmentStage,
  buyerFulfilmentStageLabel,
  fulfilmentStageIndex,
  isOpenFulfilmentStage,
} from "./order-stages";

describe("buyer fulfilment projection", () => {
  it("exposes the locked five-stage buyer timeline", () => {
    assert.deepEqual(
      FULFILMENT_TIMELINE_STAGES.map((stage) => stage.label),
      ["Confirmed", "Preparing", "Packing", "Dispatched", "Delivered"]
    );
  });

  it("projects backend stages without changing backend authority", () => {
    assert.equal(buyerFulfilmentStage("order_received"), "confirmed");
    assert.equal(buyerFulfilmentStage("payment_pending"), "confirmed");
    assert.equal(buyerFulfilmentStage("in_production"), "preparing");
    assert.equal(buyerFulfilmentStage("ready_for_dispatch"), "packing");
    assert.equal(buyerFulfilmentStage("delivered"), "delivered");
  });

  it("uses calm buyer language for unknown stages", () => {
    assert.equal(buyerFulfilmentStage("unknown_stage"), null);
    assert.equal(buyerFulfilmentStageLabel("unknown_stage"), "Order in progress");
    assert.equal(fulfilmentStageIndex("unknown_stage"), -1);
  });

  it("treats delivered as closed and other/unknown stages as open", () => {
    assert.equal(isOpenFulfilmentStage("dispatched"), true);
    assert.equal(isOpenFulfilmentStage("delivered"), false);
    assert.equal(isOpenFulfilmentStage("unknown_stage"), true);
  });
});
