/** Canonical customer fulfilment stages — single source for list and detail timelines. */
export const FULFILMENT_TIMELINE_STAGES = [
  { key: "order_received", label: "Order Received" },
  { key: "payment_pending", label: "Payment Pending" },
  { key: "in_production", label: "In Production" },
  { key: "packing", label: "Packing" },
  { key: "ready_for_dispatch", label: "Ready for Dispatch" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
] as const;

export type FulfilmentStageKey = (typeof FULFILMENT_TIMELINE_STAGES)[number]["key"];

export function fulfilmentStageIndex(stage: string): number {
  const idx = FULFILMENT_TIMELINE_STAGES.findIndex((s) => s.key === stage);
  return idx === -1 ? -1 : idx;
}

export function isOpenFulfilmentStage(stage: string): boolean {
  return !stage.toLowerCase().includes("delivered");
}
