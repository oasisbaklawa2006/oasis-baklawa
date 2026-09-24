import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BRIDGE_SOURCE = readFileSync(join(__dirname, "buyer-session-bridge.ts"), "utf8");

/**
 * Source-level binding contract for the native bridge.
 *
 * The bridge itself imports React Native/Supabase runtime modules that are not
 * safe to initialize inside this repository's Node-only unit-test harness.
 * Existing Buyer contract tests use the same source-binding pattern for
 * runtime authority wiring. This test protects the security-sensitive handoff:
 * the provider-verified Auth UUID must be forwarded to the membership claim.
 */
describe("buyer session bridge verified-user binding", () => {
  it("forwards the exact provider-verified UUID into the Buyer claim", () => {
    assert.match(
      BRIDGE_SOURCE,
      /claimApprovedB2bIdentity\s*\(\s*verifyRes\.user_id\s*\)/,
      "bridge must bind the claim to verifyRes.user_id"
    );
  });

  it("reasserts the OTP session before invoking the Buyer claim", () => {
    const setSessionIndex = BRIDGE_SOURCE.indexOf("supabase.auth.setSession");
    const claimIndex = BRIDGE_SOURCE.indexOf("claimApprovedB2bIdentity(verifyRes.user_id)");

    assert.ok(setSessionIndex >= 0, "bridge must reassert the verified OTP session");
    assert.ok(claimIndex > setSessionIndex, "claim must run only after session reassertion");
  });

  it("keeps the provider identity mismatch fail-closed before the claim", () => {
    const mismatchIndex = BRIDGE_SOURCE.indexOf("sessionData.user.id !== verifyRes.user_id");
    const claimIndex = BRIDGE_SOURCE.indexOf("claimApprovedB2bIdentity(verifyRes.user_id)");

    assert.ok(mismatchIndex >= 0, "bridge must compare token user and provider user");
    assert.ok(claimIndex > mismatchIndex, "identity comparison must precede membership claim");
  });
});
