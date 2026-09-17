import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldRefreshOnAppState, shouldRefreshOnAuthEvent } from "./buyer-session-refresh-triggers";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import type { AppStateStatus } from "react-native";

describe("shouldRefreshOnAuthEvent", () => {
  it("skips TOKEN_REFRESHED -- a successful silent token refresh changes nothing about eligibility", () => {
    assert.equal(shouldRefreshOnAuthEvent("TOKEN_REFRESHED"), false);
  });

  it("refreshes on every other auth event, including SIGNED_IN and SIGNED_OUT", () => {
    const events: AuthChangeEvent[] = [
      "SIGNED_IN",
      "SIGNED_OUT",
      "USER_UPDATED",
      "PASSWORD_RECOVERY",
      "INITIAL_SESSION",
    ];
    for (const event of events) {
      assert.equal(shouldRefreshOnAuthEvent(event), true, `expected refresh on "${event}"`);
    }
  });
});

describe("shouldRefreshOnAppState — mid-session revocation blind-spot regression", () => {
  it("refreshes on transition to active (foreground) -- this is the only trigger that catches a " +
    "buyer frozen/de-approved while the app was backgrounded, since that kind of business-data-only " +
    "change never fires an auth event", () => {
    assert.equal(shouldRefreshOnAppState("active"), true);
  });

  it("does not refresh on background or inactive -- nothing to refresh while not visible, and " +
    "refreshing here would be a pointless extra round-trip on every backgrounding, not just " +
    "foregrounding", () => {
    const nonActiveStates: AppStateStatus[] = ["background", "inactive"];
    for (const state of nonActiveStates) {
      assert.equal(shouldRefreshOnAppState(state), false, `expected no refresh on "${state}"`);
    }
  });
});
