import type { BuyerProductPrice, CustomerOrderDraftLine } from "@/types/database.types";

export type CommercialIssueCode =
  | "PRICE_UNAVAILABLE"
  | "PRICE_EXPIRED"
  | "PRICE_NOT_YET_VALID"
  | "UOM_UNRESOLVED"
  | "MOQ_UNRESOLVED"
  | "INCREMENT_UNRESOLVED"
  | "QUANTITY_BELOW_MOQ"
  | "QUANTITY_INCREMENT_MISMATCH";

export interface ResolvedCommercialRules {
  moq: number;
  increment: number;
  uom: string;
  currency: string;
  sellingPrice: number;
}

export interface CommercialValidation {
  orderable: boolean;
  code?: CommercialIssueCode;
  message?: string;
  rules?: ResolvedCommercialRules;
}

function parseInstant(iso: string | null): Date | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Mirrors Core price validity windows without inventing fallback pricing. */
export function isPriceWithinValidityWindow(price: BuyerProductPrice, asOf: Date = new Date()): CommercialValidation {
  const validFrom = parseInstant(price.valid_from);
  const validUntil = parseInstant(price.valid_until);

  if (validFrom && asOf < validFrom) {
    return {
      orderable: false,
      code: "PRICE_NOT_YET_VALID",
      message: "Pricing is not yet valid for ordering.",
    };
  }
  if (validUntil && asOf > validUntil) {
    return {
      orderable: false,
      code: "PRICE_EXPIRED",
      message: "Pricing has expired. Refresh catalogue pricing before ordering.",
    };
  }
  return { orderable: true };
}

/**
 * Resolves governed MOQ/increment/UOM/currency from buyer_product_prices_v1 projections.
 * Fails closed when any canonical commercial field is missing or outside its validity window.
 */
export function resolveCommercialRules(
  price: BuyerProductPrice | null | undefined,
  asOf: Date = new Date()
): CommercialValidation {
  if (!price) {
    return { orderable: false, code: "PRICE_UNAVAILABLE", message: "Buyer pricing unavailable." };
  }
  if (!price.uom?.trim()) {
    return { orderable: false, code: "UOM_UNRESOLVED", message: "Unit of measure is unavailable." };
  }
  if (!Number.isFinite(price.selling_price) || price.selling_price <= 0) {
    return { orderable: false, code: "PRICE_UNAVAILABLE", message: "Selling price is unavailable." };
  }
  if (!price.currency?.trim()) {
    return { orderable: false, code: "PRICE_UNAVAILABLE", message: "Currency is unavailable." };
  }

  const validity = isPriceWithinValidityWindow(price, asOf);
  if (!validity.orderable) {
    return validity;
  }

  const moq = price.minimum_order_quantity;
  const increment = price.order_increment;
  if (moq === null || moq <= 0) {
    return { orderable: false, code: "MOQ_UNRESOLVED", message: "Minimum order quantity is unavailable." };
  }
  if (increment === null || increment <= 0) {
    return { orderable: false, code: "INCREMENT_UNRESOLVED", message: "Order increment is unavailable." };
  }

  return {
    orderable: true,
    rules: {
      moq,
      increment,
      uom: price.uom,
      currency: price.currency,
      sellingPrice: price.selling_price,
    },
  };
}

/** User-facing carton/MOQ completion guidance without silently changing quantity. */
export function quantityCompletionHint(moq: number, increment: number, quantity: number): string | null {
  if (quantity < moq) {
    return `Add ${moq - quantity} more to reach MOQ ${moq}`;
  }
  const remainder = (quantity - moq) % increment;
  if (remainder !== 0) {
    return `Add ${increment - remainder} more to match order increments of ${increment}`;
  }
  return null;
}

export function validateOrderQuantity(
  price: BuyerProductPrice | null | undefined,
  quantity: number,
  asOf: Date = new Date()
): CommercialValidation {
  const resolved = resolveCommercialRules(price, asOf);
  if (!resolved.orderable || !resolved.rules) {
    return resolved;
  }

  const { moq, increment } = resolved.rules;
  if (quantity < moq) {
    return {
      orderable: false,
      code: "QUANTITY_BELOW_MOQ",
      message: quantityCompletionHint(moq, increment, quantity) ?? `Minimum order quantity is ${moq}.`,
      rules: resolved.rules,
    };
  }
  if ((quantity - moq) % increment !== 0) {
    return {
      orderable: false,
      code: "QUANTITY_INCREMENT_MISMATCH",
      message:
        quantityCompletionHint(moq, increment, quantity) ??
        `Quantity must increase in steps of ${increment} above MOQ ${moq}.`,
      rules: resolved.rules,
    };
  }
  return resolved;
}

export function defaultOrderQuantity(price: BuyerProductPrice | null | undefined, asOf?: Date): number | null {
  return resolveCommercialRules(price, asOf).rules?.moq ?? null;
}

export function validateDraftLinesAgainstPrices(
  lines: CustomerOrderDraftLine[],
  pricesByProduct: Record<string, BuyerProductPrice>,
  asOf?: Date
): CommercialValidation {
  for (const line of lines) {
    const result = validateOrderQuantity(pricesByProduct[line.product_id], line.quantity, asOf);
    if (!result.orderable) {
      return result;
    }
  }
  return { orderable: true };
}
