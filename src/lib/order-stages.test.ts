import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FULFILMENT_TIMELINE_STAGES,
  fulfilmentStageIndex,
  isOpenFulfilmentStage,
} from "./order-stages";

describe("fulfilment timeline", () => {
  it("uses one canonical stage list ending with delivered", () => {
    assert.equal(FULFILMENT_TIMELINE_STAGES.at(-1)?.key, "delivered");
    assert.equal(fulfilmentStageIndex("processing"), -1);
  });

  it("returns -1 for unknown stages", () => {
    assert.equal(fulfilmentStageIndex("processing"), -1);
    assert.equal(fulfilmentStageIndex("unknown_stage"), -1);
  });

  it("indexes known stages in fulfilment order", () => {
    assert.equal(fulfilmentStageIndex("order_received"), 0);
    assert.equal(fulfilmentStageIndex("delivered"), FULFILMENT_TIMELINE_STAGES.length - 1);
  });

  it("treats delivered as closed and other stages as open", () => {
    assert.equal(isOpenFulfilmentStage("dispatched"), true);
    assert.equal(isOpenFulfilmentStage("delivered"), false);
  });
});
