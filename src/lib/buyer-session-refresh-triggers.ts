import type { AuthChangeEvent } from "@supabase/supabase-js";
import type { AppStateStatus } from "react-native";

/**
 * Whether a Supabase onAuthStateChange event should trigger a buyer
 * eligibility refresh. TOKEN_REFRESHED is deliberately excluded: a
 * successful silent token refresh changes nothing about buyer/company
 * eligibility (that's the whole reason AppState foreground revalidation
 * exists as a separate trigger -- see shouldRefreshOnAppState below), and
 * refreshing here too would mean an eligibility RPC round-trip on every
 * ~55-minute background token cycle for no reason.
 */
export function shouldRefreshOnAuthEvent(event: AuthChangeEvent): boolean {
  return event !== "TOKEN_REFRESHED";
}

/**
 * Whether an AppState transition should trigger a buyer eligibility
 * refresh. Only the transition INTO "active" (foreground) matters --
 * "background"/"inactive" transitions have nothing to refresh (the app
 * isn't visible), and refreshing on every state value AppState reports
 * (which includes transitional states beyond just active/background on
 * some platforms) would be wasteful. This is what catches a buyer whose
 * company was frozen, or who was de-approved, while the app was
 * backgrounded or the device was locked -- see BuyerSessionContext.tsx for
 * why onAuthStateChange alone can't catch that case.
 */
export function shouldRefreshOnAppState(nextState: AppStateStatus): boolean {
  return nextState === "active";
}
