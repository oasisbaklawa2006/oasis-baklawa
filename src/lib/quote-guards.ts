import type { CustomerQuotationDetail, CustomerQuotationSummary } from "@/types/quote-contract";
import { isQuoteBackendAvailable } from "@/types/quote-contract";

type QuotationActionTarget = Pick<CustomerQuotationSummary, "status" | "is_actionable" | "current_version">;

export function isQuotationActionable(quotation: QuotationActionTarget): boolean {
  return quotation.is_actionable && quotation.status === "issued";
}

export function isQuoteAcceptEnabled(params: {
  quotation: QuotationActionTarget;
  accepting: boolean;
  keyReady: boolean;
  idempotencyKey: string | null;
  keyPersisted: boolean;
  isOnline?: boolean;
  backendAvailable?: boolean;
}): boolean {
  if (params.isOnline === false) return false;
  if (params.backendAvailable === false || !isQuoteBackendAvailable()) return false;
  if (!isQuotationActionable(params.quotation)) return false;
  if (params.accepting || !params.keyReady) return false;
  if (!params.idempotencyKey || !params.keyPersisted) return false;
  return true;
}

export function isQuoteDeclineEnabled(params: {
  quotation: QuotationActionTarget;
  declining: boolean;
  keyReady: boolean;
  idempotencyKey: string | null;
  keyPersisted: boolean;
  isOnline?: boolean;
  backendAvailable?: boolean;
}): boolean {
  if (params.isOnline === false) return false;
  if (params.backendAvailable === false || !isQuoteBackendAvailable()) return false;
  if (!isQuotationActionable(params.quotation)) return false;
  if (params.declining || !params.keyReady) return false;
  if (!params.idempotencyKey || !params.keyPersisted) return false;
  return true;
}

export function isQuoteRequestEnabled(params: {
  lineCount: number;
  submitting: boolean;
  keyReady: boolean;
  idempotencyKey: string | null;
  keyPersisted: boolean;
  isOnline?: boolean;
  backendAvailable?: boolean;
}): boolean {
  if (params.isOnline === false) return false;
  if (params.backendAvailable === false || !isQuoteBackendAvailable()) return false;
  if (params.lineCount <= 0 || params.submitting || !params.keyReady) return false;
  if (!params.idempotencyKey || !params.keyPersisted) return false;
  return true;
}

export function quotationDetailForAccept(detail: CustomerQuotationDetail | null): QuotationActionTarget | null {
  if (!detail) return null;
  return {
    status: detail.status,
    is_actionable: detail.is_actionable,
    current_version: detail.current_version,
  };
}

export function isQuotationVersionStaleError(message: string): boolean {
  return message.includes("QUOTATION_VERSION_STALE");
}
