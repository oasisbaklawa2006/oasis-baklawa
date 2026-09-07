import { callRpc } from "@/lib/rpc";
import {
  normalizeCustomerQuotationDetail,
  normalizeCustomerQuotationLine,
  normalizeCustomerQuotationSummary,
} from "@/lib/quote-projections";
import type {
  AcceptCustomerQuotationInput,
  AcceptCustomerQuotationResult,
  CustomerQuotationDetail,
  CustomerQuotationLine,
  CustomerQuotationSummary,
  DeclineCustomerQuotationInput,
  DeclineCustomerQuotationResult,
  SubmitCustomerQuotationRequestInput,
  SubmitCustomerQuotationRequestResult,
} from "@/types/quote-contract";

export async function fetchCustomerQuotations(): Promise<CustomerQuotationSummary[]> {
  const rows = await callRpc("customer_quotations_v1");
  return (rows ?? [])
    .map(normalizeCustomerQuotationSummary)
    .filter((row): row is CustomerQuotationSummary => Boolean(row));
}

export async function fetchCustomerQuotationDetail(quotationId: string): Promise<CustomerQuotationDetail | null> {
  const rows = await callRpc("customer_quotation_detail_v1", { p_quotation_id: quotationId });
  const row = Array.isArray(rows) ? rows[0] : null;
  return normalizeCustomerQuotationDetail(row);
}

export async function fetchCustomerQuotationLines(quotationId: string): Promise<CustomerQuotationLine[]> {
  const rows = await callRpc("customer_quotation_lines_v1", { p_quotation_id: quotationId });
  return (rows ?? [])
    .map(normalizeCustomerQuotationLine)
    .filter((row): row is CustomerQuotationLine => Boolean(row));
}

export async function submitCustomerQuotationRequest(
  input: SubmitCustomerQuotationRequestInput
): Promise<SubmitCustomerQuotationRequestResult> {
  const rows = await callRpc("submit_customer_quotation_request_v1", {
    p_idempotency_key: input.idempotencyKey,
    p_lines: input.lines,
    p_notes: input.notes ?? null,
  });
  const result = rows?.[0];
  if (!result) {
    throw new Error("Quotation request did not return a result. Please try again.");
  }
  return result as SubmitCustomerQuotationRequestResult;
}

export async function acceptCustomerQuotation(
  input: AcceptCustomerQuotationInput
): Promise<AcceptCustomerQuotationResult> {
  const rows = await callRpc("accept_customer_quotation_v1", {
    p_quotation_id: input.quotationId,
    p_version_number: input.versionNumber,
    p_idempotency_key: input.idempotencyKey,
  });
  const result = rows?.[0];
  if (!result) {
    throw new Error("Quotation acceptance did not return a result. Please try again.");
  }
  return result as AcceptCustomerQuotationResult;
}

export async function declineCustomerQuotation(
  input: DeclineCustomerQuotationInput
): Promise<DeclineCustomerQuotationResult> {
  const rows = await callRpc("decline_customer_quotation_v1", {
    p_quotation_id: input.quotationId,
    p_version_number: input.versionNumber,
    p_idempotency_key: input.idempotencyKey,
    p_reason: input.reason ?? null,
  });
  const result = rows?.[0];
  if (!result) {
    throw new Error("Quotation decline did not return a result. Please try again.");
  }
  return result as DeclineCustomerQuotationResult;
}
