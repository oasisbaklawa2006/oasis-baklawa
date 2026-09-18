export interface Msg91SendResult {
  accessToken: string | null;
  reqId: string | null;
  invisibleVerified: boolean;
}

interface RawMsg91SendResponse {
  type?: unknown;
  message?: unknown;
  "access-token"?: unknown;
  invisibleVerified?: unknown;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Parses the untrusted MSG91 sendOTP response.
 *
 * A reported provider success is usable only when it contains the identifier
 * required for its branch: access-token for invisible verification, otherwise
 * a non-empty reqId in message. Incomplete "success" payloads fail closed
 * instead of putting LoginScreen into an unrecoverable OTP stage.
 */
export function normalizeMsg91SendResponse(response: unknown): Msg91SendResult {
  const raw =
    response !== null && typeof response === "object"
      ? (response as RawMsg91SendResponse)
      : ({} as RawMsg91SendResponse);

  if (raw.type !== "success") {
    throw new Error(nonEmptyString(raw.message) ?? "msg91_send_failed");
  }

  if (raw.invisibleVerified === true) {
    const accessToken = nonEmptyString(raw["access-token"]);
    if (!accessToken) {
      throw new Error("msg91_send_failed");
    }
    return { accessToken, reqId: null, invisibleVerified: true };
  }

  const reqId = nonEmptyString(raw.message);
  if (!reqId) {
    throw new Error("msg91_send_failed");
  }

  return { accessToken: null, reqId, invisibleVerified: false };
}
