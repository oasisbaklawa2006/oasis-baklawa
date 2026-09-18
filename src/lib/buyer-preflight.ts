// Native client for the canonical Buyer preflight authority (buyer-login-gateway,
// Oasis-Baklawa-Central). This is the SAME governed classification Central's web
// Buyer login uses — the native app is another client of it, not a second
// authority. Never reconstruct eligibility rules on-device: the gateway result
// is authoritative and must be checked before any OTP is requested.
import { supabase } from "@/lib/supabase";
import {
  failClosedBuyerPreflight,
  normalizeBuyerPreflightResponse,
  type BuyerPreflightChannel,
  type BuyerPreflightResult,
} from "@/lib/buyer-preflight-contract";

export {
  normalizeBuyerPreflightResponse,
} from "@/lib/buyer-preflight-contract";
export type {
  BuyerPreflightChannel,
  BuyerPreflightResult,
  BuyerPreflightState,
} from "@/lib/buyer-preflight-contract";

/**
 * Calls buyer-login-gateway in `mode: "preflight"`. Must run BEFORE any OTP is
 * requested for either channel. Fails closed (ambiguous) on any transport or
 * parsing failure — never silently allows OTP when the gateway can't be reached.
 */
export async function invokeBuyerPreflight(
  channel: BuyerPreflightChannel,
  identifier: string,
  attemptId: string
): Promise<BuyerPreflightResult> {
  try {
    const { data, error } = await supabase.functions.invoke("buyer-login-gateway", {
      body: { mode: "preflight", channel, identifier, attemptId },
    });
    if (error) throw error;
    return normalizeBuyerPreflightResponse(data);
  } catch {
    return failClosedBuyerPreflight();
  }
}
