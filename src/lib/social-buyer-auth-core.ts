import type { BuyerPreflightResult, BuyerPreflightState } from "@/lib/buyer-preflight-contract";

export type SocialBuyerGateDecision =
  | { type: "allow" }
  | { type: "navigate"; screen: "AccessPending" | "AccessRejected" | "Register"; message?: string }
  | { type: "block"; state: BuyerPreflightState; message: string };

export function decideSocialBuyerGate(
  result: BuyerPreflightResult
): SocialBuyerGateDecision {
  if (result.state === "approved" && result.allowOtp === true) {
    return { type: "allow" };
  }

  if (result.state === "pending") {
    return { type: "navigate", screen: "AccessPending", message: result.message };
  }
  if (result.state === "rejected") {
    return { type: "navigate", screen: "AccessRejected", message: result.message };
  }
  if (result.state === "unknown") {
    return { type: "navigate", screen: "Register", message: result.message };
  }

  return {
    type: "block",
    state: result.state,
    message: result.message || "This account cannot use Buyer social sign-in.",
  };
}
