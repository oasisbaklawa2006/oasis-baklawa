import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GENIE_ENABLED, GENIE_PARSE_ENABLED, resolveGenieParseEnabled } from "./genie-parse-availability";

describe("GENIE_ENABLED — Phase-1 fail-closed master gate", () => {
  it("fails closed when the deployment flag is absent", () => {
    assert.equal(resolveGenieParseEnabled(undefined), false);
    assert.equal(GENIE_ENABLED, false);
    assert.equal(GENIE_PARSE_ENABLED, false);
  });

  it("enables only an explicit true value", () => {
    assert.equal(resolveGenieParseEnabled("true"), true);
    assert.equal(resolveGenieParseEnabled(" TRUE "), true);
    assert.equal(resolveGenieParseEnabled("false"), false);
    assert.equal(resolveGenieParseEnabled("1"), false);
    assert.equal(resolveGenieParseEnabled(""), false);
    assert.equal(resolveGenieParseEnabled("yes"), false);
  });

  it("aliases GENIE_PARSE_ENABLED to GENIE_ENABLED for parse chokepoints", () => {
    assert.equal(GENIE_PARSE_ENABLED, GENIE_ENABLED);
  });
});
