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
 * Defense-in-depth for the parser boundary: even if a malformed result somehow
 * reaches this pure decision layer, OTP is reachable only when BOTH the
 * canonical state is approved and the gateway permission is true.
 */
export function decideLoginAction(preflight: BuyerPreflightResult): LoginPreflightAction {
  if (preflight.state === "approved" && preflight.allowOtp === true) {
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
  // employees authenticate exclusively through the separate Admin Login.
  // ambiguous, or any contradictory approved/allowOtp=false result: fail closed
  // inline and never reach the OTP transport.
  return { type: "inline_block", state: preflight.state, message: preflight.message };
}
