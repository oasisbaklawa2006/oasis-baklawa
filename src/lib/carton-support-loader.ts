import { normalizePackingContract } from "@/lib/packing-profile-contract";
import { UNAVAILABLE_CARTON_SUPPORT, type CartonSupport } from "@/lib/carton-profile-source";
import type { BuyerProductPrice } from "@/types/database.types";

/**
 * Adapter between the Core packing-profile projections (contract v1) and the Buyer carton consumer.
 *
 * Wired behind the release flag in `carton-core-binding.ts`; both RPC names are in BUYER_DEPLOYMENT_RPC_ALLOWLIST.
 * RELEASE ORDER: Core must ship the projection migration (Core PR #471) before EXPO_PUBLIC_CARTON_PACKING_PROFILES is enabled.
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
