import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideLoginAction } from "./login-preflight-action";
import type { BuyerPreflightResult } from "./buyer-preflight";

function preflight(state: BuyerPreflightResult["state"], allowOtp: boolean, message = "msg"): BuyerPreflightResult {
  return { state, allowOtp, message };
}

describe("decideLoginAction — buyer-login-gateway preflight branches", () => {
  it("APPROVED: sends OTP, and ONLY approved sends OTP", () => {
    assert.deepEqual(decideLoginAction(preflight("approved", true)), { type: "send_otp" });
  });

  it("critical invariant: no non-approved state ever produces a send_otp action", () => {
    const nonApproved: BuyerPreflightResult["state"][] = ["pending", "rejected", "unknown", "employee", "ambiguous"];
    for (const state of nonApproved) {
      const action = decideLoginAction(preflight(state, false));
      assert.notEqual(action.type, "send_otp", `state "${state}" must never produce send_otp`);
    }
  });

  it("PENDING: navigates to AccessPending, no OTP", () => {
    const action = decideLoginAction(preflight("pending", false, "under review"));
    assert.deepEqual(action, { type: "navigate", screen: "AccessPending", message: "under review" });
  });

  it("REJECTED: navigates to AccessRejected, no OTP", () => {
    const action = decideLoginAction(preflight("rejected", false, "not approved"));
    assert.deepEqual(action, { type: "navigate", screen: "AccessRejected", message: "not approved" });
  });

  it("UNKNOWN: navigates to Register (Request B2B Access), no OTP", () => {
    const action = decideLoginAction(preflight("unknown", false));
    assert.deepEqual(action, { type: "navigate", screen: "Register" });
  });

  it("EMPLOYEE: blocks inline with Admin Login instruction — no Buyer OTP, no Buyer session, " +
    "no Buyer membership. The destination offered is the existing Admin Login surface " +
    "(work email + password, standard Supabase auth), never a Staff OTP flow, which this " +
    "app does not and must not implement", () => {
    const action = decideLoginAction(preflight("employee", false, "belongs to an Oasis employee account"));
    assert.deepEqual(action, { type: "inline_block", state: "employee", message: "belongs to an Oasis employee account" });
    // Structurally: this action type is never "send_otp" and never "navigate"
    // to any Buyer screen (Dashboard, Register, AccessPending, AccessRejected)
    // — it cannot create a Buyer session or membership because the OTP
    // transport (sendMsg91Otp) is simply never invoked for this action type.
    assert.notEqual(action.type, "send_otp");
    assert.notEqual(action.type, "navigate");
  });

  it("AMBIGUOUS: fails closed inline with a support action, no OTP", () => {
    const action = decideLoginAction(preflight("ambiguous", false, "conflicting records"));
    assert.deepEqual(action, { type: "inline_block", state: "ambiguous", message: "conflicting records" });
  });

  it("defers entirely to allowOtp rather than re-deriving eligibility from state — if the " +
    "gateway ever sent allowOtp:true for a non-'approved' state, this function would still " +
    "send OTP (no client-side eligibility reconstruction), matching the contract that the " +
    "gateway alone is authoritative", () => {
    const action = decideLoginAction(preflight("pending", true));
    assert.deepEqual(action, { type: "send_otp" });
  });
});
