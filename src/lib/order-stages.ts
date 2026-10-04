/**
 * Buyer-facing fulfilment projection.
 * Backend customer_stage values remain authoritative and are never mutated here.
 */
export const FULFILMENT_TIMELINE_STAGES = [
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "packing", label: "Packing" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
] as const;

export type FulfilmentStageKey = (typeof FULFILMENT_TIMELINE_STAGES)[number]["key"];

const CUSTOMER_STAGE_TO_BUYER_STAGE: Record<string, FulfilmentStageKey> = {
  order_received: "confirmed",
  payment_pending: "confirmed",
  confirmed: "confirmed",
  in_production: "preparing",
  production: "preparing",
  preparing: "preparing",
  packing: "packing",
  ready_for_dispatch: "packing",
  dispatched: "dispatched",
  delivered: "delivered",
};

export function buyerFulfilmentStage(stage: string): FulfilmentStageKey | null {
  return CUSTOMER_STAGE_TO_BUYER_STAGE[stage.trim().toLowerCase()] ?? null;
}

export function buyerFulfilmentStageLabel(stage: string): string {
  const projected = buyerFulfilmentStage(stage);
  return FULFILMENT_TIMELINE_STAGES.find((item) => item.key === projected)?.label ?? "Order in progress";
}

export function fulfilmentStageIndex(stage: string): number {
  const projected = buyerFulfilmentStage(stage);
  if (!projected) return -1;
  return FULFILMENT_TIMELINE_STAGES.findIndex((item) => item.key === projected);
}

export function isOpenFulfilmentStage(stage: string): boolean {
  return buyerFulfilmentStage(stage) !== "delivered";
}
