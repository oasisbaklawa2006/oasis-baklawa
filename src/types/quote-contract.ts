/**
 * P106 governed quotation contract — Core authority prerequisite.
 * Buyer must not call these RPCs until oasis-supabase-core ships them
 * and Mission Control adds them to scripts/verify-contract-boundary.mjs.
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

/** RPCs from CORE_QUOTE_RPC_PREREQUISITES currently bound in the Buyer allowlist. */
export const BUYER_BOUND_QUOTE_RPCS: readonly CoreQuoteRpcName[] = [];

export const QUOTATION_STATUSES = [
  "REQUESTED",
  "ISSUED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "CONVERTED",
  "CANCELLED",
] as const;

export type CustomerQuotationStatus = (typeof QUOTATION_STATUSES)[number];

export interface CustomerQuotation {
  quotation_id: string;
  quotation_number: string;
  company_id: string;
  status: string;
  commercial_version_id: string | null;
  commercial_version_number: number | null;
  frozen_customer_total: number | null;
  currency: string | null;
  expires_at: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  customer_safe_projection: boolean;
}

export interface CustomerQuotationLine {
  quotation_id: string;
  line_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number | null;
  line_total: number | null;
  uom: string | null;
}

export interface CustomerQuotationDetail extends CustomerQuotation {
  lines: CustomerQuotationLine[];
  terms_summary: string | null;
  lead_time_summary: string | null;
}

export interface SubmitCustomerQuotationRequestInput {
  idempotencyKey: string;
  lines: { product_id: string; quantity: number }[];
  notes?: string | null;
}

export interface SubmitCustomerQuotationRequestResult {
  quotation_id: string;
  quotation_number: string;
  status: string;
  is_duplicate_submission: boolean;
}

export interface AcceptCustomerQuotationInput {
  idempotencyKey: string;
  quotationId: string;
}

/** Governed handoff only — must not create a shadow Sales Order in Buyer. */
export interface AcceptCustomerQuotationResult {
  quotation_id: string;
  handoff_status: string;
  conversion_reference: string | null;
  is_duplicate_submission: boolean;
}

export interface DeclineCustomerQuotationInput {
  quotationId: string;
  reason?: string | null;
}

export interface DeclineCustomerQuotationResult {
  quotation_id: string;
  status: string;
}

export function isQuoteBackendAvailable(boundRpcs: readonly string[] = BUYER_BOUND_QUOTE_RPCS): boolean {
  const bound = new Set(boundRpcs);
  return CORE_QUOTE_RPC_PREREQUISITES.every((rpc) => bound.has(rpc));
}
