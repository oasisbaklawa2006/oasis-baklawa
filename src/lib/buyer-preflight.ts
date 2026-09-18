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
  ok?: unknown;
  state?: unknown;
  allowOtp?: unknown;
  message?: unknown;
  error?: unknown;
}

const BUYER_PREFLIGHT_STATES = new Set<BuyerPreflightState>([
  "approved",
  "pending",
  "employee",
  "rejected",
  "unknown",
  "ambiguous",
]);

const PREFLIGHT_FAILURE_MESSAGE =
  "We couldn't verify this account right now. Please contact Oasis support.";

function isBuyerPreflightState(value: unknown): value is BuyerPreflightState {
  return typeof value === "string" && BUYER_PREFLIGHT_STATES.has(value as BuyerPreflightState);
}

function failClosedPreflight(message?: unknown): BuyerPreflightResult {
  return {
    state: "ambiguous",
    allowOtp: false,
    message: typeof message === "string" && message.trim() ? message : PREFLIGHT_FAILURE_MESSAGE,
  };
}

/**
 * Converts untrusted gateway JSON into the only preflight shape LoginScreen is
 * allowed to consume. OTP permission is valid iff the state is exactly
 * "approved"; every malformed or contradictory combination fails closed.
 */
export function normalizeBuyerPreflightResponse(data: unknown): BuyerPreflightResult {
  const raw =
    data !== null && typeof data === "object"
      ? (data as RawPreflightResponse)
      : ({} as RawPreflightResponse);

  if (
    raw.ok !== true ||
    !isBuyerPreflightState(raw.state) ||
    typeof raw.allowOtp !== "boolean"
  ) {
    return failClosedPreflight(raw.message);
  }

  const shouldAllowOtp = raw.state === "approved";
  if (raw.allowOtp !== shouldAllowOtp) {
    return failClosedPreflight(raw.message);
  }

  return {
    state: raw.state,
    allowOtp: raw.allowOtp,
    message:
      typeof raw.message === "string"
        ? raw.message
        : raw.allowOtp
          ? ""
          : PREFLIGHT_FAILURE_MESSAGE,
  };
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
    return normalizeBuyerPreflightResponse(data);
  } catch {
    return failClosedPreflight();
  }
}
