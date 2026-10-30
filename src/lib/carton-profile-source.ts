import {
  INITIAL_CARTON_CATALOGUE,
  planCartons,
  resolveCartonConfiguration,
  type CartonConfiguration,
  type CartonPreview,
  type SkuPackingProfile,
} from "@/lib/carton-builder";
import { evaluateCartonCommercial, type CartonCommercialReport } from "@/lib/carton-commercial";
import type { BuyerProductPrice, CustomerOrderDraft } from "@/types/database.types";

/**
 * Seam for verified carton data.
 *
 * EXTERNAL DEPENDENCY (Core): there is currently no buyer-safe Core projection of per-SKU packing profiles
 * (packing group, slots per unit, carton eligibility). products.carton_type / packs_per_master_carton are
 * unrestricted master data, are not exposed to buyers, and do not map 1:1 onto the 4/6/10 illustrated cartons.
 * Until Core publishes such a projection and it is bound here, support is reported as unavailable and the UI
 * shows nothing carton-specific. Nothing is inferred or invented.
 */
export interface CartonSupport {
  available: boolean;
  catalogue: readonly CartonConfiguration[];
  profiles: ReadonlyMap<string, SkuPackingProfile>;
  unavailableReason?: string;
}

export const UNAVAILABLE_CARTON_SUPPORT: CartonSupport = {
  available: false,
  catalogue: INITIAL_CARTON_CATALOGUE,
  profiles: new Map(),
  unavailableReason: "Verified packing data has not been published for buyers yet.",
};

export function getCartonSupport(): CartonSupport {
  return UNAVAILABLE_CARTON_SUPPORT;
}

export interface CartonViewModel {
  configId: string;
  preview: CartonPreview;
  commercial: CartonCommercialReport;
}

/** Cart-level carton view models for a single configuration; empty when support is unavailable. */
export function buildCartonViewModels(
  draft: CustomerOrderDraft | null,
  support: CartonSupport,
  configId: string,
  pricesByProduct: Readonly<Record<string, BuyerProductPrice | undefined>>,
  asOf?: Date
): CartonViewModel[] {
  if (!support.available || !draft?.lines.length) return [];
  const config = resolveCartonConfiguration(support.catalogue, configId, asOf);
  if (!config) return [];
  const lines = draft.lines.map((l) => ({ productId: l.product_id, quantity: l.quantity }));
  const plan = planCartons(config, lines, support.profiles, { asOf });
  // MOQ/increment apply to the customer's whole line, not to the slice that lands in one carton.
  const lineByProduct = new Map(lines.map((l) => [l.productId, l]));
  return plan.cartons.map((preview) => {
    const cartonLines = preview.allocations.map((a) => lineByProduct.get(a.productId) ?? { productId: a.productId, quantity: a.quantity });
    return { configId, preview, commercial: evaluateCartonCommercial(preview, cartonLines, pricesByProduct, support.profiles, asOf) };
  });
}

/**
 * First active configuration able to place every cart line (verified profiles only). Returns null when
 * support is unavailable or any line is unverified, so no partial/guessed carton view is ever shown.
 */
export function selectCartonConfigId(draft: CustomerOrderDraft | null, support: CartonSupport, asOf?: Date): string | null {
  if (!support.available || !draft?.lines.length) return null;
  const lines = draft.lines.map((l) => ({ productId: l.product_id, quantity: l.quantity }));
  for (const id of Array.from(new Set(support.catalogue.map((c) => c.id)))) {
    const config = resolveCartonConfiguration(support.catalogue, id, asOf);
    if (!config) continue;
    const plan = planCartons(config, lines, support.profiles, { asOf });
    if (plan.cartons.length > 0 && plan.unplaceable.length === 0) return id;
  }
  return null;
}
