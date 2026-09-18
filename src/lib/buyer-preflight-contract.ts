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

export function failClosedBuyerPreflight(message?: unknown): BuyerPreflightResult {
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
    return failClosedBuyerPreflight(raw.message);
  }

  const shouldAllowOtp = raw.state === "approved";
  if (raw.allowOtp !== shouldAllowOtp) {
    return failClosedBuyerPreflight(raw.message);
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
