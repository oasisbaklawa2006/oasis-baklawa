// Pure decision logic for what LoginScreen does with a buyer-login-gateway
// preflight result, extracted specifically so the critical invariant --
// OTP is requested for APPROVED and ONLY APPROVED -- can be asserted directly
// without rendering the screen (no React Native Testing Library in this repo;
// this is the smaller, dependency-free alternative). LoginScreen.tsx calls
// this and executes the returned action; it contains no logic of its own
// beyond what this function decides.
import type { BuyerPreflightResult, BuyerPreflightState } from "@/lib/buyer-preflight";

export type LoginPreflightAction =
  | { type: "send_otp" }
  | { type: "navigate"; screen: "AccessPending" | "AccessRejected" | "Register"; message?: string }
  | { type: "inline_block"; state: BuyerPreflightState; message: string };

/**
 * The single critical invariant this app enforces: sendOTP is only ever
 * reachable for state === "approved" (equivalently, allowOtp === true, which
 * the gateway sets exclusively for "approved"). Every other state is routed
 * away or blocked inline -- none of them reach the OTP transport.
 */
export function decideLoginAction(preflight: BuyerPreflightResult): LoginPreflightAction {
  if (preflight.allowOtp) {
    return { type: "send_otp" };
  }
  if (preflight.state === "pending") {
    return { type: "navigate", screen: "AccessPending", message: preflight.message };
  }
  if (preflight.state === "rejected") {
    return { type: "navigate", screen: "AccessRejected", message: preflight.message };
  }
  if (preflight.state === "unknown") {
    return { type: "navigate", screen: "Register" };
  }
  // employee: this Buyer App has no staff authentication of its own — Oasis
  // employees (admins, management, sales, accounts, dispatch, factory,
  // operations, etc.) authenticate exclusively through the separate Admin
  // Login surface (registered work email + password, standard Supabase
  // email/password session), never through Buyer OTP. This function only
  // signals the block; LoginScreen shows the Admin Login instruction inline.
  // ambiguous: no dedicated destination either — fail closed inline with a
  // support action, matching Central's own inline (non-navigating) treatment.
  return { type: "inline_block", state: preflight.state, message: preflight.message };
}
