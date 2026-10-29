/** Buyer-only carton preview. Never writes factory packing or dispatch state. */
export type CartonCapacity = 4 | 6 | 10 | (number & {});
export interface CartonConfiguration {
  id: string;
  version: number;
  family: "bulk_sweets" | string;
  capacity: CartonCapacity;
  innerPack: string;
  active: boolean;
  /** Explicitly verified packing groups; absent means fail closed. */
  eligibleGroups: readonly string[];
  visualAssetKeys: readonly string[];
}
export interface CartonAllocation {
  productId: string;
  quantity: number;
  /** Approved physical packaging group; never inferred from carton capacity. */
  packingGroup?: string | null;
}
export interface CartonPreview {
  filled: number;
  capacity: number;
  remaining: number;
  percentage: number;
  state: "empty" | "partial" | "full" | "sealed-preview";
  eligible: boolean;
  issues: string[];
}
export const INITIAL_CARTON_CATALOGUE: readonly CartonConfiguration[] = [
  { id: "888x4", version: 1, family: "bulk_sweets", capacity: 4, innerPack: "tray", active: false, eligibleGroups: [], visualAssetKeys: ["empty","one","two","three","four","sealed"] },
  { id: "bulk-6", version: 1, family: "bulk_sweets", capacity: 6, innerPack: "box", active: false, eligibleGroups: [], visualAssetKeys: [] },
  { id: "bulk-10", version: 1, family: "bulk_sweets", capacity: 10, innerPack: "tray", active: false, eligibleGroups: [], visualAssetKeys: [] },
];
/** Deterministic visual preview. Fullness is NOT commercial validity or checkout permission. */
export function previewCarton(config: CartonConfiguration, lines: readonly CartonAllocation[], showSealed = true): CartonPreview {
  const issues: string[] = [];
  if (!Number.isSafeInteger(config.capacity) || config.capacity <= 0) issues.push("Invalid carton capacity.");
  if (!config.active) issues.push("Carton configuration is not activated.");
  if (!config.eligibleGroups.length) issues.push("Verified SKU compatibility mapping is unavailable.");
  const seen = new Set<string>();
  let filled = 0;
  for (const line of lines) {
    if (!line.productId || seen.has(line.productId)) issues.push("Missing or duplicate product allocation.");
    seen.add(line.productId);
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) issues.push("Allocation must contain positive whole packing units.");
    else filled += line.quantity;
    if (!line.packingGroup || !config.eligibleGroups.includes(line.packingGroup)) issues.push("Product packing compatibility is not verified.");
  }
  if (filled > config.capacity) issues.push("Carton capacity exceeded.");
  const capacity = config.capacity > 0 ? config.capacity : 0;
  const full = capacity > 0 && filled === capacity;
  return {
    filled, capacity, remaining: Math.max(0, capacity - filled),
    percentage: capacity ? Math.min(100, Math.max(0, (filled / capacity) * 100)) : 0,
    state: full ? (showSealed ? "sealed-preview" : "full") : filled > 0 ? "partial" : "empty",
    eligible: issues.length === 0 && full,
    issues,
  };
}
