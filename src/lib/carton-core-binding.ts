import { loadCartonSupportFromCore, type CoreRpc, type LoadResult } from "@/lib/carton-support-loader";
import { UNAVAILABLE_CARTON_SUPPORT } from "@/lib/carton-profile-source";
import type { BuyerProductPrice } from "@/types/database.types";

/**
 * Live binding of the Core packing-profile projections (contract v1) to the cart.
 *
 * RELEASE ORDER: Core must publish `buyer_carton_configurations_v1` / `buyer_packing_profiles_v1` first. Until then the release flag
 * stays off and no request is made. The flag is a Buyer-side safety switch only; what is orderable as a carton is decided by approved,
 * effective rows in Core. Core also remains the only authority for price, GST, MOQ and order acceptance.
 */
export function cartonPackingEnabled(): boolean {
  return process.env.EXPO_PUBLIC_CARTON_PACKING_PROFILES === "true";
}

export async function fetchCartonSupport(prices: readonly BuyerProductPrice[], options: { rpc: CoreRpc; asOf?: Date; enabled?: boolean }): Promise<LoadResult> {
  const enabled = options.enabled ?? cartonPackingEnabled();
  if (!enabled) return { support: UNAVAILABLE_CARTON_SUPPORT, issues: [], reason: undefined };
  return loadCartonSupportFromCore(options.rpc, prices, options.asOf);
}

/** Only the most recently started request may publish its result, so a slow stale response can never replace a newer one. */
export function createLatestOnly() {
  let latest = 0;
  return {
    begin(): () => boolean { const mine = ++latest; return () => mine === latest; },
    cancel() { latest++; },
  };
}
