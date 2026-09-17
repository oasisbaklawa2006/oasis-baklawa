import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { routeFromBuyerSnapshot } from "./session-routing";
import type { BuyerSessionSnapshot, BuyerEligibilityState } from "./api/buyer";

interface RecordedCall {
  screen: string;
  params?: unknown;
}

function fakeNavigator() {
  const calls: RecordedCall[] = [];
  return {
    calls,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    replace: (screen: string, params?: any) => {
      calls.push({ screen, params });
    },
  };
}

function snapshot(state: BuyerEligibilityState, overrides: Partial<BuyerSessionSnapshot> = {}): BuyerSessionSnapshot {
  return {
    state,
    companyId: null,
    company: null,
    message: null,
    userId: state === "unauthenticated" ? null : "user-1",
    ...overrides,
  };
}

describe("routeFromBuyerSnapshot / historical UAT deadlock regression", () => {
  it("routes approved_buyer straight to Dashboard", () => {
    const nav = fakeNavigator();
    routeFromBuyerSnapshot(nav, snapshot("approved_buyer"), true);
    assert.deepEqual(nav.calls, [{ screen: "MainTabs", params: { screen: "Dashboard" } }]);
  });

  it("NEVER routes any post-auth state to Register — this is the historical deadlock: an " +
    "approved buyer whose session resolved to a non-approved state must never be sent back " +
    "to the application form (Register), which risked a duplicate/conflicted application", () => {
    const states: BuyerEligibilityState[] = ["unauthenticated", "approved_buyer", "no_membership", "backend_failure"];
    const nav = fakeNavigator();
    for (const state of states) {
      routeFromBuyerSnapshot(nav, snapshot(state), true);
    }
    assert.ok(
      nav.calls.every((call) => call.screen !== "Register"),
      `routeFromBuyerSnapshot must never navigate to Register; got: ${JSON.stringify(nav.calls)}`
    );
  });

  it("routes no_membership (approved-then-desynced fail-closed case) to SessionRecovery, not Register", () => {
    const nav = fakeNavigator();
    routeFromBuyerSnapshot(nav, snapshot("no_membership", { message: "test message" }), true);
    assert.equal(nav.calls[0].screen, "SessionRecovery");
    assert.deepEqual(nav.calls[0].params, { message: "test message" });
  });

  it("routes backend_failure to SessionRecovery with a fallback message when none is given", () => {
    const nav = fakeNavigator();
    routeFromBuyerSnapshot(nav, snapshot("backend_failure"), true);
    assert.equal(nav.calls[0].screen, "SessionRecovery");
    assert.ok(typeof (nav.calls[0].params as { message?: string })?.message === "string");
  });

  it("routes unauthenticated to Welcome when onboarded, Onboarding otherwise", () => {
    const navOnboarded = fakeNavigator();
    routeFromBuyerSnapshot(navOnboarded, snapshot("unauthenticated"), true);
    assert.deepEqual(navOnboarded.calls, [{ screen: "Welcome", params: undefined }]);

    const navFresh = fakeNavigator();
    routeFromBuyerSnapshot(navFresh, snapshot("unauthenticated"), false);
    assert.deepEqual(navFresh.calls, [{ screen: "Onboarding", params: undefined }]);
  });
});
