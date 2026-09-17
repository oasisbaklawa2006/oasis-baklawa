import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertApprovedB2bClaimBound, type ApprovedB2bIdentityClaimOutcome } from "./buyer-identity-claim-core";

function outcome(overrides: Partial<ApprovedB2bIdentityClaimOutcome> = {}): ApprovedB2bIdentityClaimOutcome {
  return {
    applicationId: null,
    companyId: null,
    claimed: false,
    alreadyActive: false,
    ...overrides,
  };
}

describe("assertApprovedB2bClaimBound", () => {
  it("does not throw when requireBound is false, regardless of outcome", () => {
    assert.doesNotThrow(() => assertApprovedB2bClaimBound(outcome(), false));
  });

  it("does not throw when the identity was freshly claimed", () => {
    assert.doesNotThrow(() =>
      assertApprovedB2bClaimBound(outcome({ claimed: true, applicationId: "app-1", companyId: "co-1" }), true)
    );
  });

  it("does not throw when membership was already active (legacy-bound replay)", () => {
    assert.doesNotThrow(() =>
      assertApprovedB2bClaimBound(outcome({ alreadyActive: true, companyId: "co-1" }), true)
    );
  });

  it("throws (fail closed) when a fresh identity was signalled bound but the claim returned no-match — " +
    "this is the deadlock guard: a brand-new approved identity must never silently fall through as " +
    "if unauthenticated/no-application", () => {
    assert.throws(
      () => assertApprovedB2bClaimBound(outcome(), true),
      /APPROVED_B2B_IDENTITY_CLAIM_FAILED:bind_failed/
    );
  });
});
