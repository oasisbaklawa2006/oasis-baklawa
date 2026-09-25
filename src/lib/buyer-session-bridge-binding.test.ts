import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  completeVerifiedBuyerSessionAndClaim,
  type BuyerSessionBridgeCoreDeps,
} from "./buyer-session-bridge-core";

const BRIDGE_SOURCE = readFileSync(join(__dirname, "buyer-session-bridge.ts"), "utf8");
const CLAIM_SOURCE = readFileSync(join(__dirname, "buyer-identity-claim.ts"), "utf8");

/** Returns the canonical successful Buyer claim fixture used by bridge tests. */
function successfulClaim() {
  return {
    applicationId: "app-1",
    companyId: "company-1",
    claimed: true,
    alreadyActive: false,
  };
}

/** Builds bridge-core dependencies with focused per-test overrides. */
function depsWith(
  overrides: Partial<BuyerSessionBridgeCoreDeps> = {}
): BuyerSessionBridgeCoreDeps {
  return {
    verifyOtp: async () => ({
      userId: "verified-user",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      errorMessage: null,
    }),
    setSession: async () => ({ userId: "verified-user", errorMessage: null }),
    signOutLocal: async () => undefined,
    claimApprovedB2bIdentity: async () => successfulClaim(),
    ...overrides,
  };
}

describe("buyer session bridge verified-user binding", () => {
  it("keeps the native wrapper delegated to the verified-session handoff core", () => {
    assert.match(BRIDGE_SOURCE, /completeVerifiedBuyerSessionAndClaim\s*\(/);
    assert.match(BRIDGE_SOURCE, /providerUserId:\s*verifyRes\.user_id/);
  });

  it("forwards the exact provider UUID and verified JWT into the claim transport", async () => {
    const calls: Array<{ userId: string; accessToken: string }> = [];
    const result = await completeVerifiedBuyerSessionAndClaim(
      {
        tokenHash: "token-hash",
        providerUserId: "verified-user",
        approvedB2bPendingClaim: true,
      },
      depsWith({
        claimApprovedB2bIdentity: async (userId, accessToken) => {
          calls.push({ userId, accessToken });
          return successfulClaim();
        },
      })
    );

    assert.deepEqual(calls, [{ userId: "verified-user", accessToken: "access-token" }]);
    assert.equal(result.userId, "verified-user");
  });

  it("uses explicit-token RPC transport for verified first-login claims", () => {
    assert.match(
      CLAIM_SOURCE,
      /callRpcWithAccessToken\(verifiedAccessToken, APPROVED_B2B_IDENTITY_CLAIM_RPC\)/
    );
    assert.match(CLAIM_SOURCE, /if \(!expectedUserId\)[\s\S]*waitForExpectedAuthenticatedSession/);
  });

  it("fails closed on OTP identity mismatch: signs out and never claims", async () => {
    let signOuts = 0;
    let claims = 0;
    const deps = depsWith({
      verifyOtp: async () => ({
        userId: "wrong-user",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        errorMessage: null,
      }),
      signOutLocal: async () => { signOuts += 1; },
      claimApprovedB2bIdentity: async () => { claims += 1; return successfulClaim(); },
    });
    await assert.rejects(
      completeVerifiedBuyerSessionAndClaim(
        { tokenHash: "token-hash", providerUserId: "verified-user", approvedB2bPendingClaim: true },
        deps
      ),
      /session_identity_mismatch/
    );
    assert.equal(signOuts, 1);
    assert.equal(claims, 0);
  });

  it("fails closed on setSession failure: signs out and never claims", async () => {
    let signOuts = 0;
    let claims = 0;
    const deps = depsWith({
      setSession: async () => ({ userId: null, errorMessage: "persist_failed" }),
      signOutLocal: async () => { signOuts += 1; },
      claimApprovedB2bIdentity: async () => { claims += 1; return successfulClaim(); },
    });
    await assert.rejects(
      completeVerifiedBuyerSessionAndClaim(
        { tokenHash: "token-hash", providerUserId: "verified-user", approvedB2bPendingClaim: true },
        deps
      ),
      /persist_failed/
    );
    assert.equal(signOuts, 1);
    assert.equal(claims, 0);
  });

  it("fails closed on rebound identity mismatch: signs out and never claims", async () => {
    let signOuts = 0;
    let claims = 0;
    const deps = depsWith({
      setSession: async () => ({ userId: "wrong-user", errorMessage: null }),
      signOutLocal: async () => { signOuts += 1; },
      claimApprovedB2bIdentity: async () => { claims += 1; return successfulClaim(); },
    });
    await assert.rejects(
      completeVerifiedBuyerSessionAndClaim(
        { tokenHash: "token-hash", providerUserId: "verified-user", approvedB2bPendingClaim: true },
        deps
      ),
      /session_create_failed/
    );
    assert.equal(signOuts, 1);
    assert.equal(claims, 0);
  });
});
