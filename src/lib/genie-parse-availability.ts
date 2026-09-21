/**
 * Oasis Genie network gate.
 *
 * The governed Core source contract now lives in oasis-supabase-core PR #341.
 * Runtime enablement remains explicit so Buyer builds cannot call the Edge
 * Function before that exact source is merged, deployed and provider-configured.
 *
 * EAS/Expo only exposes EXPO_PUBLIC_* values to the client bundle.
 */
export function resolveGenieParseEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export const GENIE_PARSE_ENABLED = resolveGenieParseEnabled(
  process.env.EXPO_PUBLIC_GENIE_PARSE_ENABLED
);
