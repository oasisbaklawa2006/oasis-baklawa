import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRpcError } from "./rpc-errors";

describe("parseRpcError", () => {
  it("accepts PostgrestError-like objects that are not instanceof Error", () => {
    const parsed = parseRpcError({ message: "BUYER_NOT_ELIGIBLE: approved buyer company context is required", code: "42501" });
    assert.equal(parsed.code, "BUYER_NOT_ELIGIBLE");
  });

  it("does not treat unknown governed prefixes as known codes", () => {
    const parsed = parseRpcError({ message: "APPLICATION_FAILED: trade application did not return a result" });
    assert.equal(parsed.code, "UNKNOWN");
  });

  it("maps AUTH_REQUIRED from SQLSTATE", () => {
    const parsed = parseRpcError({ message: "authentication is required", code: "28000" });
    assert.equal(parsed.code, "AUTH_REQUIRED");
  });

  it("maps network failures", () => {
    const parsed = parseRpcError({ message: "Failed to fetch" });
    assert.equal(parsed.code, "NETWORK");
  });
});
