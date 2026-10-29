import { validateOrderQuantity, type CommercialValidation } from "@/lib/buyer-commercial-validation";
import type { CartonLine, CartonPreview, ProfileRegistry, SkuPackingProfile } from "@/lib/carton-builder";
import type { BuyerProductPrice } from "@/types/database.types";

/**
 * Commercial evaluation layered on top of the physical carton preview.
 *
 * This is a client-side PRE-CHECK for clearer guidance only. Core remains authoritative for price,
 * MOQ, increments, quotes, cart readiness and order submission; nothing here substitutes for those
 * checks and no quantity is ever adjusted to manufacture validity.
 */
export type CartonCommercialCode =
  | "UOM_MISMATCH"
  | "PRICE_OR_RULE_ISSUE"
  | "CARTON_NOT_COMPLETE";

export interface CartonLineCommercial {
  productId: string;
  quantity: number;
  validation: CommercialValidation;
  uomMatchesProfile: boolean;
}

export interface CartonCommercialReport {
  lines: CartonLineCommercial[];
  commercialValid: boolean;
  physicallyComplete: boolean;
  /** Both pre-checks pass. Core still decides; this only enables the next step in the UI. */
  clientPrecheckPassed: boolean;
  blockers: { code: CartonCommercialCode; productId?: string; message: string }[];
}

const normaliseUom = (uom: string | null | undefined) => (uom ?? "").trim().toLowerCase();

export function evaluateCartonCommercial(
  preview: CartonPreview,
  lines: readonly CartonLine[],
  pricesByProduct: Readonly<Record<string, BuyerProductPrice | undefined>>,
  profiles: ProfileRegistry,
  asOf?: Date
): CartonCommercialReport {
  const blockers: CartonCommercialReport["blockers"] = [];
  const evaluated: CartonLineCommercial[] = lines.map((line) => {
    const price = pricesByProduct[line.productId];
    const profile: SkuPackingProfile | undefined =
      profiles instanceof Map ? profiles.get(line.productId) : (profiles as Record<string, SkuPackingProfile>)[line.productId];
    const validation = validateOrderQuantity(price ?? null, line.quantity, asOf);
    const uomMatchesProfile = Boolean(price && profile && normaliseUom(price.uom) === normaliseUom(profile.commercialUom));
    if (!validation.orderable) {
      blockers.push({ code: "PRICE_OR_RULE_ISSUE", productId: line.productId, message: validation.message ?? "This product's ordering rules are not met." });
    }
    if (price && profile && !uomMatchesProfile) {
      blockers.push({
        code: "UOM_MISMATCH",
        productId: line.productId,
        message: "The ordering unit differs from the packing unit, so the carton fill cannot be confirmed.",
      });
    }
    return { productId: line.productId, quantity: line.quantity, validation, uomMatchesProfile };
  });
  if (!preview.physicallyComplete) {
    blockers.push({ code: "CARTON_NOT_COMPLETE", message: "The carton is not yet complete." });
  }
  const rulesValid = evaluated.every((l) => l.validation.orderable);
  const uomOk = evaluated.every((l) => l.uomMatchesProfile);
  return {
    lines: evaluated,
    commercialValid: rulesValid && uomOk,
    physicallyComplete: preview.physicallyComplete,
    clientPrecheckPassed: rulesValid && uomOk && preview.physicallyComplete,
    blockers,
  };
}
