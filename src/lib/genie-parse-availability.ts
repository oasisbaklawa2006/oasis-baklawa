/**
 * Oasis Genie parsing is a release-controlled runtime feature.
 *
 * Source availability alone never enables the customer path. The app must be
 * built with EXPO_PUBLIC_GENIE_PARSE_ENABLED=true only after the governed
 * ai-order-parse backend has passed Core release/deployment certification.
 * Missing, malformed, or any non-"true" value fails closed.
 */
export function resolveGenieParseEnabled(value: string | undefined): boolean {
  return value === "true";
}

export const GENIE_PARSE_ENABLED = resolveGenieParseEnabled(
  process.env.EXPO_PUBLIC_GENIE_PARSE_ENABLED
);
