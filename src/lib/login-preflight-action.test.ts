import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decideLoginAction } from "./login-preflight-action";
import {
  normalizeBuyerPreflightResponse,
  type BuyerPreflightResult,
} from "./buyer-preflight-contract";

function preflight(
  state: BuyerPreflightResult["state"],
  allowOtp: boolean,
  message = "msg"
): BuyerPreflightResult {
  return { state, allowOtp, message };
}

describe("decideLoginAction — buyer-login-gateway preflight branches", () => {
  it("APPROVED: sends OTP, and ONLY approved sends OTP", () => {
    assert.deepEqual(decideLoginAction(preflight("approved", true)), { type: "send_otp" });
  });

  it("critical invariant: no non-approved state ever produces a send_otp action even if allowOtp is malformed true", () => {
    const nonApproved: BuyerPreflightResult["state"][] = [
      "pending",
      "rejected",
      "unknown",
      "employee",
      "ambiguous",
    ];
    for (const state of nonApproved) {
      const action = decideLoginAction(preflight(state, true));
      assert.notEqual(action.type, "send_otp", `state "${state}" must never produce send_otp`);
    }
  });

  it("approved without allowOtp fails closed instead of sending OTP", () => {
    const action = decideLoginAction(preflight("approved", false, "not permitted"));
    assert.deepEqual(action, {
      type: "inline_block",
      state: "approved",
      message: "not permitted",
    });
  });

  it("PENDING: navigates to AccessPending, no OTP", () => {
    const action = decideLoginAction(preflight("pending", false, "under review"));
    assert.deepEqual(action, {
      type: "navigate",
      screen: "AccessPending",
      message: "under review",
    });
  });

  it("REJECTED: navigates to AccessRejected, no OTP", () => {
    const action = decideLoginAction(preflight("rejected", false, "not approved"));
    assert.deepEqual(action, {
      type: "navigate",
      screen: "AccessRejected",
      message: "not approved",
    });
  });

  it("UNKNOWN: navigates to Register (Request B2B Access), no OTP", () => {
    const action = decideLoginAction(preflight("unknown", false));
    assert.deepEqual(action, { type: "navigate", screen: "Register" });
  });

  it(
    "EMPLOYEE: blocks inline with Admin Login instruction — no Buyer OTP, no Buyer session, " +
      "no Buyer membership",
    () => {
      const action = decideLoginAction(
        preflight("employee", false, "belongs to an Oasis employee account")
      );
      assert.deepEqual(action, {
        type: "inline_block",
        state: "employee",
        message: "belongs to an Oasis employee account",
      });
      assert.notEqual(action.type, "send_otp");
      assert.notEqual(action.type, "navigate");
    }
  );

  it("AMBIGUOUS: fails closed inline with a support action, no OTP", () => {
    const action = decideLoginAction(
      preflight("ambiguous", false, "conflicting records")
    );
    assert.deepEqual(action, {
      type: "inline_block",
      state: "ambiguous",
      message: "conflicting records",
    });
  });
});

describe("normalizeBuyerPreflightResponse — untrusted gateway boundary", () => {
  it("accepts only the canonical approved + allowOtp true combination", () => {
    assert.deepEqual(
      normalizeBuyerPreflightResponse({
        ok: true,
        state: "approved",
        allowOtp: true,
        message: "",
      }),
      { state: "approved", allowOtp: true, message: "" }
    );
  });

  it("rejects an unknown state even when allowOtp is true", () => {
    const result = normalizeBuyerPreflightResponse({
      ok: true,
      state: "invalid",
      allowOtp: true,
    });
    assert.equal(result.state, "ambiguous");
    assert.equal(result.allowOtp, false);
  });

  it("rejects allowOtp true for every non-approved state", () => {
    for (const state of ["pending", "employee", "rejected", "unknown", "ambiguous"]) {
      const result = normalizeBuyerPreflightResponse({
        ok: true,
        state,
        allowOtp: true,
      });
      assert.equal(result.state, "ambiguous");
      assert.equal(result.allowOtp, false);
    }
  });

  it("rejects approved when allowOtp is false or missing", () => {
    for (const payload of [
      { ok: true, state: "approved", allowOtp: false },
      { ok: true, state: "approved" },
    ]) {
      const result = normalizeBuyerPreflightResponse(payload);
      assert.equal(result.state, "ambiguous");
      assert.equal(result.allowOtp, false);
    }
  });

  it("accepts valid non-approved states only with allowOtp false", () => {
    const result = normalizeBuyerPreflightResponse({
      ok: true,
      state: "pending",
      allowOtp: false,
      message: "under review",
    });
    assert.deepEqual(result, {
      state: "pending",
      allowOtp: false,
      message: "under review",
    });
  });
});


describe("LoginScreen OTP request contract", () => {
  it("revalidates Buyer eligibility before every resend and only then reaches MSG91", () => {
    const source = readFileSync(
      new URL("../screens/LoginScreen.tsx", import.meta.url),
      "utf8"
    );
    const start = source.indexOf("async function resendOtp");
    const end = source.indexOf("\n  return (", start);
    assert.ok(start >= 0 && end > start, "resendOtp implementation must be present");

    const resend = source.slice(start, end);
    const preflightIndex = resend.indexOf("invokeBuyerPreflight(");
    const decisionIndex = resend.indexOf("decideLoginAction(");
    const retryIndex = resend.indexOf("retryMsg91Otp(");

    assert.ok(preflightIndex >= 0, "resend must re-run canonical Buyer preflight");
    assert.ok(decisionIndex > preflightIndex, "resend must classify the fresh preflight result");
    assert.ok(retryIndex > decisionIndex, "MSG91 retry must occur only after the fresh eligibility decision");
    assert.match(
      resend,
      /action\.type === "send_otp"|action\.type === "navigate"[\s\S]*action\.type === "inline_block"[\s\S]*retryMsg91Otp/,
      "non-approved resend states must route/block before MSG91 retry"
    );
  });
});
