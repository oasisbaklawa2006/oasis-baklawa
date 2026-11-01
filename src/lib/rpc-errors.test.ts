import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRpcError } from "./rpc-errors";

describe("parseRpcError", () => {
  it("maps BUYER_NOT_ELIGIBLE from governed message with SQLSTATE 42501", () => {
    const parsed = parseRpcError({ message: "BUYER_NOT_ELIGIBLE: approved buyer company context is required", code: "42501" });
    assert.equal(parsed.code, "BUYER_NOT_ELIGIBLE");
  });

  it("does not map bare SQLSTATE 42501 to BUYER_NOT_ELIGIBLE", () => {
    const parsed = parseRpcError({ message: "permission denied for table orders", code: "42501" });
    assert.equal(parsed.code, "UNKNOWN");
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

  it("maps missing or invalid Supabase API key to backend configuration", () => {
    const missing = parseRpcError({ message: "No API key found in request" });
    assert.equal(missing.code, "BACKEND_CONFIGURATION");

    const invalid = parseRpcError({ message: "Invalid API key" });
    assert.equal(invalid.code, "BACKEND_CONFIGURATION");
    assert.match(invalid.message, /update to the latest build/i);
  });

  it("maps quotation expiry from governed message", () => {
    const parsed = parseRpcError({ message: "QUOTATION_EXPIRED" });
    assert.equal(parsed.code, "QUOTATION_EXPIRED");
  });

  it("maps stale version to customer refresh guidance", () => {
    const parsed = parseRpcError({ message: "QUOTATION_VERSION_STALE: current version is 2" });
    assert.equal(parsed.code, "QUOTATION_VERSION_STALE");
  });

  it("maps the Core commit-time carton enforcement error to an actionable, non-leaky message", () => {
    const parsed = parseRpcError({
      code: "23514",
      message: "CARTON_ENFORCEMENT_VIOLATION",
      details: '[{"code": "CARTON_INCOMPLETE", "group": "888x4|g", "slots": 3}]',
    });
    assert.equal(parsed.code, "CARTON_ENFORCEMENT_VIOLATION");
    assert.match(parsed.message, /shipping carton must be full/i);
    assert.doesNotMatch(parsed.message, /888x4|slots|CARTON_INCOMPLETE/);
  });
});
