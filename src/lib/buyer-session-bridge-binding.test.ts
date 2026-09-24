import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  completeVerifiedBuyerSessionAndClaim,
  type BuyerSessionBridgeCoreDeps,
} from "./buyer-session-bridge-core";

const BRIDGE_SOURCE = readFileSync(join(__dirname, "buyer-session-bridge.ts"), "utf8");

/** Returns a successful Buyer membership claim fixture for bridge behavior tests. */
function successfulClaim() {
  return {
    applicationId: "app-1",
    companyId: "company-1",
    claimed: true,
    alreadyActive: false,
  };
}

/** Builds bridge-core dependencies while allowing each test to override one handoff boundary. */
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

/**
 * Source-level binding contract plus executable fail-closed coverage for the
 * native bridge. The wrapper imports React Native/Supabase runtime modules, so
 * the runtime-agnostic handoff core is executed with stubs while source checks
 * ensure the native wrapper remains wired to that core.
 */
describe("buyer session bridge verified-user binding", () => {
  it("keeps the native wrapper delegated to the verified-session handoff core", () => {
    assert.match(
      BRIDGE_SOURCE,
      /completeVerifiedBuyerSessionAndClaim\s*\(/,
      "native bridge must delegate the post-provider handoff to the tested core"
    );
    assert.match(
      BRIDGE_SOURCE,
      /providerUserId:\s*verifyRes\.user_id/,
      "native bridge must pass the provider-verified UUID to the tested core"
    );
  });

  it("forwards the exact provider-verified UUID into the Buyer claim", async () => {
    const claimUserIds: string[] = [];
    const result = await completeVerifiedBuyerSessionAndClaim(
      {
        tokenHash: "token-hash",
        providerUserId: "verified-user",
        approvedB2bPendingClaim: true,
      },
      depsWith({
        claimApprovedB2bIdentity: async (expectedUserId) => {
          claimUserIds.push(expectedUserId);
          return successfulClaim();
        },
      })
    );

    assert.deepEqual(claimUserIds, ["verified-user"]);
    assert.equal(result.userId, "verified-user");
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
      signOutLocal: async () => {
        signOuts += 1;
      },
      claimApprovedB2bIdentity: async () => {
        claims += 1;
        return successfulClaim();
      },
    });

    await assert.rejects(
      completeVerifiedBuyerSessionAndClaim(
        {
          tokenHash: "token-hash",
          providerUserId: "verified-user",
          approvedB2bPendingClaim: true,
        },
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
      signOutLocal: async () => {
        signOuts += 1;
      },
      claimApprovedB2bIdentity: async () => {
        claims += 1;
        return successfulClaim();
      },
    });

    await assert.rejects(
      completeVerifiedBuyerSessionAndClaim(
        {
          tokenHash: "token-hash",
          providerUserId: "verified-user",
          approvedB2bPendingClaim: true,
        },
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
      signOutLocal: async () => {
        signOuts += 1;
      },
      claimApprovedB2bIdentity: async () => {
        claims += 1;
        return successfulClaim();
      },
    });

    await assert.rejects(
      completeVerifiedBuyerSessionAndClaim(
        {
          tokenHash: "token-hash",
          providerUserId: "verified-user",
          approvedB2bPendingClaim: true,
        },
        deps
      ),
      /session_create_failed/
    );

    assert.equal(signOuts, 1);
    assert.equal(claims, 0);
  });
});
