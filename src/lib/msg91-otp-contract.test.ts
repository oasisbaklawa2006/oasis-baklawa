import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeMsg91SendResponse } from "./msg91-otp-contract";

describe("normalizeMsg91SendResponse", () => {
  it("accepts a normal success only with a non-empty reqId", () => {
    assert.deepEqual(
      normalizeMsg91SendResponse({ type: "success", message: "req-123" }),
      { accessToken: null, reqId: "req-123", invisibleVerified: false }
    );
  });

  it("rejects a normal success that omits the reqId", () => {
    assert.throws(
      () => normalizeMsg91SendResponse({ type: "success" }),
      /msg91_send_failed/
    );
    assert.throws(
      () => normalizeMsg91SendResponse({ type: "success", message: "   " }),
      /msg91_send_failed/
    );
  });

  it("accepts invisible verification only with a non-empty access token", () => {
    assert.deepEqual(
      normalizeMsg91SendResponse({
        type: "success",
        invisibleVerified: true,
        "access-token": "token-123",
      }),
      { accessToken: "token-123", reqId: null, invisibleVerified: true }
    );
  });

  it("rejects invisible success without its access token", () => {
    assert.throws(
      () =>
        normalizeMsg91SendResponse({
          type: "success",
          invisibleVerified: true,
          message: "req-that-must-not-be-used-as-fallback",
        }),
      /msg91_send_failed/
    );
  });

  it("preserves provider failure messages when present", () => {
    assert.throws(
      () => normalizeMsg91SendResponse({ type: "error", message: "provider refused" }),
      /provider refused/
    );
  });
});
