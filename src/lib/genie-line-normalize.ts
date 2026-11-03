export interface NormalizedGenieLine {
  productName: string;
  quantity: number;
  /** Exactly what the parser returned; "" when the parser gave no unit. An absent unit must stay absent. */
  uom: string;
}

/**
 * Normalises one parsed line from the Genie edge function. An omitted unit stays "" (it must not be silently turned into
 * "units": Genie quantity resolution treats an explicit count unit as a real unit that has to match the product's unit).
 */
export function normalizeGenieLine(value: unknown): NormalizedGenieLine | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const productName = typeof row.productName === "string" ? row.productName : typeof row.product_name === "string" ? row.product_name : null;
  const quantity = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
  // Missing/null unit = omitted ("" stays absent). A PRESENT but non-string unit is malformed input: reject the line rather than
  // coercing it to "" (which would skip unit matching and could resolve against a product with a different unit).
  if (row.uom != null && typeof row.uom !== "string") return null;
  const uom = typeof row.uom === "string" ? row.uom : "";
  if (!productName?.trim() || !Number.isFinite(quantity) || quantity <= 0) return null;
  return { productName: productName.trim(), quantity, uom };
}
