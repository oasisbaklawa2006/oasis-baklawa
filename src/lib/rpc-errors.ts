export type RpcErrorCode =
  | "AUTH_REQUIRED"
  | "BUYER_NOT_ELIGIBLE"
  | "APPLICATION_INCOMPLETE"
  | "PRODUCT_UNAVAILABLE"
  | "QUANTITY_RULE_VIOLATION"
  | "DRAFT_NOT_FOUND"
  | "DRAFT_NOT_READY"
  | "DRAFT_NOT_ACTIVE"
  | "VALIDATION_FAILED"
  | "DUPLICATE_APPLICATION"
  | "MOBILE_NUMBER_ALREADY_REGISTERED"
  | "NETWORK"
  | "UNKNOWN";

export const KNOWN_RPC_ERROR_CODES: ReadonlySet<RpcErrorCode> = new Set([
  "AUTH_REQUIRED",
  "BUYER_NOT_ELIGIBLE",
  "APPLICATION_INCOMPLETE",
  "PRODUCT_UNAVAILABLE",
  "QUANTITY_RULE_VIOLATION",
  "DRAFT_NOT_FOUND",
  "DRAFT_NOT_READY",
  "DRAFT_NOT_ACTIVE",
  "VALIDATION_FAILED",
  "DUPLICATE_APPLICATION",
  "MOBILE_NUMBER_ALREADY_REGISTERED",
  "NETWORK",
  "UNKNOWN",
]);

export interface ParsedRpcError {
  code: RpcErrorCode;
  message: string;
  raw?: string;
}

const GOVERNED_PREFIX_PATTERN = /^([A-Z][A-Z0-9_]+):/;

function isRpcErrorCode(value: string): value is RpcErrorCode {
  return KNOWN_RPC_ERROR_CODES.has(value as RpcErrorCode);
}

function extractGovernedCode(raw: string): RpcErrorCode | null {
  const match = raw.match(GOVERNED_PREFIX_PATTERN);
  if (!match) return null;
  const candidate = match[1];
  return isRpcErrorCode(candidate) ? candidate : null;
}

function getErrorMessage(error: unknown): string {
  if (error === null || error === undefined) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

function getSqlState(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function inferCode(raw: string, sqlState: string | null): RpcErrorCode {
  if (raw.includes("Failed to fetch") || raw.includes("Network request failed")) {
    return "NETWORK";
  }
  if (sqlState === "28000" || raw.includes("JWT") || raw.includes("session expired")) {
    return "AUTH_REQUIRED";
  }
  if (raw.includes("BUYER_NOT_ELIGIBLE") || sqlState === "42501") {
    return "BUYER_NOT_ELIGIBLE";
  }
  if (raw.includes("APPLICATION_INCOMPLETE")) return "APPLICATION_INCOMPLETE";
  if (raw.includes("PRODUCT_UNAVAILABLE")) return "PRODUCT_UNAVAILABLE";
  if (raw.includes("QUANTITY_RULE_VIOLATION")) return "QUANTITY_RULE_VIOLATION";
  if (raw.includes("DRAFT_NOT_FOUND") || sqlState === "P0002") return "DRAFT_NOT_FOUND";
  if (raw.includes("DRAFT_NOT_READY")) return "DRAFT_NOT_READY";
  if (raw.includes("DRAFT_NOT_ACTIVE")) return "DRAFT_NOT_ACTIVE";
  if (raw.includes("VALIDATION_FAILED")) return "VALIDATION_FAILED";
  if (raw.includes("DUPLICATE_APPLICATION") || (sqlState === "23505" && raw.includes("APPLICATION"))) {
    return "DUPLICATE_APPLICATION";
  }
  if (raw.includes("MOBILE_NUMBER_ALREADY_REGISTERED")) return "MOBILE_NUMBER_ALREADY_REGISTERED";
  return "UNKNOWN";
}

export function parseRpcError(error: unknown): ParsedRpcError {
  if (error === null || error === undefined) {
    return { code: "UNKNOWN", message: "Something went wrong. Please try again." };
  }

  const raw = getErrorMessage(error);
  const sqlState = getSqlState(error);

  if (raw.includes("Failed to fetch") || raw.includes("Network request failed")) {
    return {
      code: "NETWORK",
      message: customerMessage("NETWORK", raw),
      raw,
    };
  }

  const governed = extractGovernedCode(raw);
  const code = governed ?? inferCode(raw, sqlState);

  return { code, message: customerMessage(code, raw), raw };
}

function customerMessage(code: RpcErrorCode, raw: string): string {
  switch (code) {
    case "AUTH_REQUIRED":
      return "Your session has expired. Please log in again.";
    case "BUYER_NOT_ELIGIBLE":
      return "Your trade account is not approved for ordering yet.";
    case "APPLICATION_INCOMPLETE":
      return "Complete your B2B trade application before ordering.";
    case "PRODUCT_UNAVAILABLE":
      return "This product is not available for your account right now.";
    case "QUANTITY_RULE_VIOLATION":
      return "Quantity does not meet MOQ, increment, or carton rules for this product.";
    case "DRAFT_NOT_FOUND":
      return "No active order draft was found. Add items from the catalogue.";
    case "DRAFT_NOT_READY":
      return "Your cart is not ready for checkout. Review quantity rules below.";
    case "DRAFT_NOT_ACTIVE":
      return "This order draft can no longer be changed.";
    case "VALIDATION_FAILED":
      return raw.replace(GOVERNED_PREFIX_PATTERN, "").trim() || "Please check your input and try again.";
    case "DUPLICATE_APPLICATION":
      return "An application with this contact information already exists.";
    case "MOBILE_NUMBER_ALREADY_REGISTERED":
      return "This mobile number is already linked to another account.";
    case "NETWORK":
      return "Network connection failed. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
