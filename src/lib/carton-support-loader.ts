import { normalizePackingContract } from "@/lib/packing-profile-contract";
import { UNAVAILABLE_CARTON_SUPPORT, type CartonSupport } from "@/lib/carton-profile-source";
import type { BuyerProductPrice } from "@/types/database.types";

/**
 * Adapter between the Core packing-profile projections (contract v1) and the Buyer carton consumer.
 *
 * NOT YET WIRED INTO THE APP. Core has not published `buyer_carton_configurations_v1` / `buyer_packing_profiles_v1`
 * (see docs/carton-builder/final/CORE_INTEGRATION.md). Activation steps once Core ships them:
 *   1. add both names to BUYER_DEPLOYMENT_RPC_ALLOWLIST and required-rpc-bindings;
 *   2. call loadCartonSupportFromCore from the cart (behind a release flag) and pass the result where getCartonSupport() is used.
 * Core stays authoritative: this adapter only reads, never writes, and every failure yields "unavailable" (no carton UI), never a guess.
 */
export type CoreRpc = (name: "buyer_carton_configurations_v1" | "buyer_packing_profiles_v1") => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;

export interface LoadResult {
  support: CartonSupport;
  /** Why support is unavailable, for diagnostics only (never shown to buyers). */
  reason?: "rpc_error" | "rpc_missing" | "contract_rejected";
  issues: readonly string[];
}

const MISSING_CODES = new Set(["PGRST202", "42883", "404"]);
const unavailable = (reason: LoadResult["reason"], issues: string[] = []): LoadResult => ({ support: UNAVAILABLE_CARTON_SUPPORT, reason, issues });

export async function loadCartonSupportFromCore(rpc: CoreRpc, prices: readonly BuyerProductPrice[], asOf: Date = new Date()): Promise<LoadResult> {
  let configs: Awaited<ReturnType<CoreRpc>>, profiles: Awaited<ReturnType<CoreRpc>>;
  try {
    [configs, profiles] = await Promise.all([rpc("buyer_carton_configurations_v1"), rpc("buyer_packing_profiles_v1")]);
  } catch (e) {
    return unavailable("rpc_error", [e instanceof Error ? e.message : "rpc threw"]);
  }
  for (const r of [configs, profiles]) {
    if (r.error) return unavailable(MISSING_CODES.has(r.error.code ?? "") ? "rpc_missing" : "rpc_error", [`${r.error.code ?? ""} ${r.error.message ?? ""}`.trim()]);
  }
  const priceUomByProduct = new Map(prices.map((p) => [p.product_id, p.uom] as [string, string]));
  const result = normalizePackingContract(configs.data, profiles.data, { asOf, priceUomByProduct });
  if (!result.available) return { ...unavailable("contract_rejected", result.issues.map((i) => i.code)) };
  return {
    support: { available: true, catalogue: result.configs, profiles: result.profiles },
    issues: result.issues.map((i) => i.code), // rejected rows are reported; accepted rows are still served
  };
}
