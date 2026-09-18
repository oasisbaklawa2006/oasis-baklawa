// Native client for the canonical Buyer preflight authority (buyer-login-gateway,
// Oasis-Baklawa-Central). This is the SAME governed classification Central's web
// Buyer login uses — the native app is another client of it, not a second
// authority. Never reconstruct eligibility rules on-device: the gateway result
// is authoritative and must be checked before any OTP is requested.
import { supabase } from "@/lib/supabase";

export type BuyerPreflightChannel = "mobile" | "email";

export type BuyerPreflightState =
  | "approved"
  | "pending"
  | "employee"
  | "rejected"
  | "unknown"
  | "ambiguous";

export interface BuyerPreflightResult {
  state: BuyerPreflightState;
  allowOtp: boolean;
  message: string;
}

interface RawPreflightResponse {
  ok?: boolean;
  state?: BuyerPreflightState;
  allowOtp?: boolean;
  message?: string;
  error?: string;
}

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
    const raw = (data ?? {}) as RawPreflightResponse;
    if (!raw.ok || !raw.state) {
      return {
        state: "ambiguous",
        allowOtp: false,
        message: raw.message ?? "We couldn't verify this account right now. Please contact Oasis support.",
      };
    }
    return {
      state: raw.state,
      allowOtp: Boolean(raw.allowOtp),
      message:
        raw.message ??
        (raw.allowOtp
          ? ""
          : "We couldn't verify this account right now. Please contact Oasis support."),
    };
  } catch {
    return {
      state: "ambiguous",
      allowOtp: false,
      message: "We couldn't verify this account right now. Please contact Oasis support.",
    };
  }
}
