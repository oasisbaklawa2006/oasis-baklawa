/**
 * Governed customer quotation contracts — aligned to Core `80851e7c`
 * (migration `20260906150000_p106_customer_quotation_authority.sql`).
 */
export const CORE_QUOTE_RPC_PREREQUISITES = [
  "customer_quotations_v1",
  "customer_quotation_detail_v1",
  "customer_quotation_lines_v1",
  "submit_customer_quotation_request_v1",
  "accept_customer_quotation_v1",
  "decline_customer_quotation_v1",
] as const;

export type CoreQuoteRpcName = (typeof CORE_QUOTE_RPC_PREREQUISITES)[number];

/** RPCs bound in Buyer `verify-contract-boundary.mjs` — must match prerequisites exactly. */
export const BUYER_BOUND_QUOTE_RPCS: readonly CoreQuoteRpcName[] = [...CORE_QUOTE_RPC_PREREQUISITES];

export const QUOTATION_STATUSES = ["issued", "accepted", "declined", "expired", "superseded"] as const;

export type CustomerQuotationStatus = (typeof QUOTATION_STATUSES)[number];

export interface CustomerQuotationSummary {
  quotation_id: string;
  quotation_number: string;
  status: string;
  current_version: number;
  quotation_value: number;
  advance_required: number;
  expires_at: string;
  is_actionable: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerQuotationDetail {
  quotation_id: string;
  quotation_number: string;
  status: string;
  current_version: number;
  version_id: string;
  quotation_value: number;
  advance_required: number;
  expires_at: string;
  is_actionable: boolean;
  request_notes: string | null;
  terms_snapshot: Record<string, unknown> | null;
  commercial_snapshot: unknown[] | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerQuotationLine {
  line_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  currency: string;
  uom: string | null;
  gst_rate: number | null;
  tax_inclusive: boolean;
  minimum_order_quantity: number | null;
  order_increment: number | null;
  min_carton_qty: number | null;
  version_number: number;
}

export interface SubmitCustomerQuotationRequestInput {
  idempotencyKey: string;
  lines: { product_id: string; quantity: number }[];
  notes?: string | null;
}

export interface SubmitCustomerQuotationRequestResult {
  quotation_id: string;
  quotation_number: string;
  version_number: number;
  quotation_value: number;
  advance_required: number;
  status: string;
  expires_at: string;
  already_applied: boolean;
}

export interface AcceptCustomerQuotationInput {
  quotationId: string;
  versionNumber: number;
  idempotencyKey: string;
}

/** Governed P107 handoff only — no Sales Order creation in Buyer. */
export interface AcceptCustomerQuotationResult {
  quotation_id: string;
  handoff_id: string;
  version_number: number;
  handoff_status: string;
  already_applied: boolean;
}

export interface DeclineCustomerQuotationInput {
  quotationId: string;
  versionNumber: number;
  idempotencyKey: string;
  reason?: string | null;
}

export interface DeclineCustomerQuotationResult {
  quotation_id: string;
  status: string;
  version_number: number;
  already_applied: boolean;
}

export function isQuoteBackendAvailable(boundRpcs: readonly string[] = BUYER_BOUND_QUOTE_RPCS): boolean {
  const bound = new Set(boundRpcs);
  return CORE_QUOTE_RPC_PREREQUISITES.every((rpc) => bound.has(rpc));
}
