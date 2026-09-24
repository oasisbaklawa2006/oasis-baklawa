import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertApprovedB2bClaimBound,
  waitForExpectedAuthenticatedSession,
  type ApprovedB2bIdentityClaimOutcome,
} from "./buyer-identity-claim-core";

/** Builds a Buyer identity-claim outcome fixture with safe fail-closed defaults. */
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

describe("waitForExpectedAuthenticatedSession", () => {
  it("accepts the expected user immediately", async () => {
    const ready = await waitForExpectedAuthenticatedSession(
      async () => "user-1",
      "user-1",
      3,
      0,
      async () => undefined
    );
    assert.equal(ready, true);
  });

  it("retries through the React Native persistence gap until the expected user is visible", async () => {
    const observations: (string | null)[] = [null, null, "user-1"];
    let reads = 0;

    const ready = await waitForExpectedAuthenticatedSession(
      async () => observations[reads++] ?? null,
      "user-1",
      4,
      0,
      async () => undefined
    );

    assert.equal(ready, true);
    assert.equal(reads, 3);
  });

  it("never treats a different persisted user as the verified buyer", async () => {
    let reads = 0;
    const ready = await waitForExpectedAuthenticatedSession(
      async () => {
        reads += 1;
        return "wrong-user";
      },
      "user-1",
      3,
      0,
      async () => undefined
    );

    assert.equal(ready, false);
    assert.equal(reads, 3);
  });

  it("still supports recovery callers that only require any authenticated session", async () => {
    const ready = await waitForExpectedAuthenticatedSession(
      async () => "existing-user",
      null,
      1,
      0,
      async () => undefined
    );
    assert.equal(ready, true);
  });
});
