/**
 * Oasis Genie Phase-1 / Phase-2 master gate (fail-closed).
 *
 * Phase 1: absent or malformed config keeps Genie OFF — no navigation, no
 * overlay interception, and no ai-order-parse invocation.
 *
 * Phase 2: set EXPO_PUBLIC_GENIE_PARSE_ENABLED=true only after the governed
 * Core `ai-order-parse` function (oasis-supabase-core #341) is deployed and
 * provider-configured for the target runtime.
 *
 * EAS/Expo only exposes EXPO_PUBLIC_* values to the client bundle.
 */
export function resolveGenieParseEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** Master Buyer gate for Genie UI, navigation, and governed parse calls. */
export const GENIE_ENABLED = resolveGenieParseEnabled(
  process.env.EXPO_PUBLIC_GENIE_PARSE_ENABLED
);

/** @deprecated Prefer GENIE_ENABLED — retained for existing parse chokepoints. */
export const GENIE_PARSE_ENABLED = GENIE_ENABLED;
