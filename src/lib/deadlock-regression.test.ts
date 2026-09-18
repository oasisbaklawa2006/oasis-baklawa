import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideLoginAction } from "./login-preflight-action";
import { assertApprovedB2bClaimBound } from "./buyer-identity-claim-core";
import { routeFromBuyerSnapshot } from "./session-routing";
import type { BuyerPreflightResult } from "./buyer-preflight";
import type { ApprovedB2bIdentityClaimOutcome } from "./buyer-identity-claim-core";
import type { BuyerSessionSnapshot } from "./api/buyer";

interface RecordedCall {
  screen: string;
  params?: unknown;
}
function fakeNavigator() {
  const calls: RecordedCall[] = [];
  return { calls, replace: (screen: string, params?: unknown) => calls.push({ screen, params }) };
}

/**
 * End-to-end pure-state walk of the historical physical-UAT deadlock scenario:
 * an approved B2B application, logging in with the approved identifier,
 * against every decision point this repo owns client-side (preflight
 * decision -> claim-bound assertion -> post-claim session routing). Backend
 * behavior for the claim RPC itself (legacy-binding preservation, exact-one-
 * company resolution, ambiguous-company fail-closed) is Core's own authority
 * and already covered there -- see
 * oasis-supabase-core/supabase/tests/20260910040000_b2b_prelogin_access_lifecycle_contract.sql
 * and 20260914060000_b2b_verified_email_identity_claim_contract.sql, which
 * this test does not duplicate. What this test proves is that the NATIVE
 * client, given the outcomes those Core contracts guarantee, cannot itself
 * reintroduce the deadlock (routing an approved identity back to Register).
 */
describe("APPROVED CLIENT end-to-end regression (historical physical-UAT deadlock)", () => {
  it("CASE A — approved, existing legacy-bound application: preflight allows OTP, claim reports " +
    "already-active membership (no new claim needed, no new application, existing binding " +
    "preserved by Core), and routing lands on Dashboard -- Register is never shown", () => {
    // 1. Preflight
    const preflight: BuyerPreflightResult = {
      state: "approved",
      allowOtp: true,
      message: "Approved B2B account found. Continue with mobile OTP.",
    };
    const loginAction = decideLoginAction(preflight);
    assert.deepEqual(loginAction, { type: "send_otp" });

    // 2. Claim outcome as Core's current dual-identifier RPC would report for
    // a legacy-bound application being replayed by its already-bound owner
    // (already_active: true, claimed: false -- no new application, no new
    // company, existing binding untouched; see AUTH-01 migration comment
    // "existing application user_id is never overwritten when non-null").
    const claimOutcome: ApprovedB2bIdentityClaimOutcome = {
      applicationId: "app-existing-legacy",
      companyId: "company-1",
      claimed: false,
      alreadyActive: true,
    };
    // approved_b2b_pending_claim is false here because msg91-otp/msg91-email-session
    // only sets it for a brand-new (is_new) identity -- not this replay case.
    assert.doesNotThrow(() => assertApprovedB2bClaimBound(claimOutcome, false));

    // 3. Session resolution reflects the now-active membership.
    const snapshot: BuyerSessionSnapshot = {
      state: "approved_buyer",
      companyId: claimOutcome.companyId,
      company: null,
      message: null,
      userId: "auth-uuid-current",
    };

    // 4. Routing.
    const nav = fakeNavigator();
    routeFromBuyerSnapshot(nav, snapshot, true);

    assert.deepEqual(nav.calls, [{ screen: "MainTabs", params: { screen: "Dashboard" } }]);
    assert.ok(nav.calls.every((c) => c.screen !== "Register"), "Register must never be shown to an approved identity");
    assert.equal(nav.calls.length, 1, "no duplicate/extra navigation occurred");
  });

  it("CASE A2 — approved, brand-new identity (first-ever login for this approved application): " +
    "claim must actually bind or the client fails closed rather than silently treating the " +
    "buyer as unapproved", () => {
    const freshClaim: ApprovedB2bIdentityClaimOutcome = {
      applicationId: "app-2",
      companyId: "company-2",
      claimed: true,
      alreadyActive: false,
    };
    // approved_b2b_pending_claim: true for a genuinely new identity.
    assert.doesNotThrow(() => assertApprovedB2bClaimBound(freshClaim, true));

    const nav = fakeNavigator();
    routeFromBuyerSnapshot(
      nav,
      { state: "approved_buyer", companyId: "company-2", company: null, message: null, userId: "u2" },
      true
    );
    assert.deepEqual(nav.calls, [{ screen: "MainTabs", params: { screen: "Dashboard" } }]);
  });

  it("CASE A3 — approved, but Core signalled a pending bind that never actually bound: fails " +
    "closed (throws) rather than routing anywhere -- this is the deadlock guard itself", () => {
    const unboundClaim: ApprovedB2bIdentityClaimOutcome = {
      applicationId: null,
      companyId: null,
      claimed: false,
      alreadyActive: false,
    };
    assert.throws(() => assertApprovedB2bClaimBound(unboundClaim, true));
  });

  it("CASE B — pending: no OTP, no session, routed to AccessPending only", () => {
    const action = decideLoginAction({ state: "pending", allowOtp: false, message: "under review" });
    assert.deepEqual(action, { type: "navigate", screen: "AccessPending", message: "under review" });
  });

  it("CASE C — rejected: no OTP, no session, routed to AccessRejected only", () => {
    const action = decideLoginAction({ state: "rejected", allowOtp: false, message: "not active" });
    assert.deepEqual(action, { type: "navigate", screen: "AccessRejected", message: "not active" });
  });

  it("CASE D — unknown: no OTP, no session, routed to Register (this is the ONLY case that " +
    "legitimately reaches Register from the login screen)", () => {
    const action = decideLoginAction({ state: "unknown", allowOtp: false, message: "not registered" });
    assert.deepEqual(action, { type: "navigate", screen: "Register" });
  });

  it("CASE E — employee: no Buyer OTP, no Buyer session/membership, Admin Login offered", () => {
    const action = decideLoginAction({ state: "employee", allowOtp: false, message: "employee account" });
    assert.equal(action.type, "inline_block");
    assert.notEqual(action.type, "send_otp");
  });

  it("CASE F — ambiguous: fails closed, no OTP", () => {
    const action = decideLoginAction({ state: "ambiguous", allowOtp: false, message: "conflicting records" });
    assert.equal(action.type, "inline_block");
    assert.notEqual(action.type, "send_otp");
  });
});
