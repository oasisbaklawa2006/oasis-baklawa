import type { AuthError, PostgrestError } from "@supabase/supabase-js";

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

export interface ParsedRpcError {
  code: RpcErrorCode;
  message: string;
  raw?: string;
}

const CODE_PATTERN = /^([A-Z_]+):/;

export function parseRpcError(error: PostgrestError | AuthError | Error | null | undefined): ParsedRpcError {
  if (!error) {
    return { code: "UNKNOWN", message: "Something went wrong. Please try again." };
  }

  const raw = "message" in error ? error.message : String(error);

  if (raw.includes("Failed to fetch") || raw.includes("Network request failed")) {
    return { code: "NETWORK", message: "Network connection failed. Check your connection and try again.", raw };
  }

  const codeMatch = raw.match(CODE_PATTERN);
  const code = (codeMatch?.[1] as RpcErrorCode | undefined) ?? inferCode(raw);

  return { code, message: customerMessage(code, raw), raw };
}

function inferCode(raw: string): RpcErrorCode {
  if (raw.includes("JWT") || raw.includes("session") || raw.includes("28000")) return "AUTH_REQUIRED";
  if (raw.includes("BUYER_NOT_ELIGIBLE") || raw.includes("42501")) return "BUYER_NOT_ELIGIBLE";
  if (raw.includes("APPLICATION_INCOMPLETE")) return "APPLICATION_INCOMPLETE";
  if (raw.includes("PRODUCT_UNAVAILABLE")) return "PRODUCT_UNAVAILABLE";
  if (raw.includes("QUANTITY_RULE_VIOLATION")) return "QUANTITY_RULE_VIOLATION";
  if (raw.includes("DRAFT_NOT_FOUND")) return "DRAFT_NOT_FOUND";
  if (raw.includes("DRAFT_NOT_READY")) return "DRAFT_NOT_READY";
  if (raw.includes("DRAFT_NOT_ACTIVE")) return "DRAFT_NOT_ACTIVE";
  if (raw.includes("VALIDATION_FAILED")) return "VALIDATION_FAILED";
  if (raw.includes("DUPLICATE_APPLICATION")) return "DUPLICATE_APPLICATION";
  if (raw.includes("MOBILE_NUMBER_ALREADY_REGISTERED")) return "MOBILE_NUMBER_ALREADY_REGISTERED";
  return "UNKNOWN";
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
      return raw.replace(CODE_PATTERN, "").trim() || "Please check your input and try again.";
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
