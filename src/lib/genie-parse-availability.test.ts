import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GENIE_PARSE_ENABLED,
  resolveGenieParseEnabled,
} from "./genie-parse-availability";

describe("GENIE_PARSE_ENABLED — ai-order-parse governance gate", () => {
  it("fails closed unless the build explicitly enables the certified backend", () => {
    assert.equal(resolveGenieParseEnabled(undefined), false);
    assert.equal(resolveGenieParseEnabled(""), false);
    assert.equal(resolveGenieParseEnabled("false"), false);
    assert.equal(resolveGenieParseEnabled("TRUE"), false);
    assert.equal(resolveGenieParseEnabled("true"), true);
  });

  it("remains disabled in ordinary test/build environments without an explicit release flag", () => {
    assert.equal(GENIE_PARSE_ENABLED, process.env.EXPO_PUBLIC_GENIE_PARSE_ENABLED === "true");
  });
});
