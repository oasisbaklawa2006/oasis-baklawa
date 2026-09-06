import type { CustomerQuotation } from "@/types/quote-contract";
import { isQuoteBackendAvailable } from "@/types/quote-contract";

export function isQuotationExpired(quotation: CustomerQuotation, now: Date = new Date()): boolean {
  if (quotation.status === "EXPIRED") return true;
  if (!quotation.expires_at) return false;
  const expiresAt = Date.parse(quotation.expires_at);
  if (!Number.isFinite(expiresAt)) return true;
  return expiresAt <= now.getTime();
}

export function assertQuotationCompanyMatch(quotationCompanyId: string, eligibleCompanyId: string | null): boolean {
  if (!eligibleCompanyId) return false;
  return quotationCompanyId === eligibleCompanyId;
}

export function canViewQuotation(quotation: CustomerQuotation, eligibleCompanyId: string | null): boolean {
  if (!quotation.customer_safe_projection) return false;
  return assertQuotationCompanyMatch(quotation.company_id, eligibleCompanyId);
}

export function isQuoteAcceptEnabled(params: {
  quotation: CustomerQuotation;
  eligibleCompanyId: string | null;
  accepting: boolean;
  keyReady: boolean;
  idempotencyKey: string | null;
  keyPersisted: boolean;
  isOnline?: boolean;
  backendAvailable?: boolean;
  now?: Date;
}): boolean {
  if (params.isOnline === false) return false;
  if (params.backendAvailable === false || !isQuoteBackendAvailable()) return false;
  if (!canViewQuotation(params.quotation, params.eligibleCompanyId)) return false;
  if (params.quotation.status !== "ISSUED") return false;
  if (isQuotationExpired(params.quotation, params.now)) return false;
  if (params.accepting || !params.keyReady) return false;
  if (!params.idempotencyKey || !params.keyPersisted) return false;
  return true;
}

export function isQuoteDeclineEnabled(params: {
  quotation: CustomerQuotation;
  eligibleCompanyId: string | null;
  declining: boolean;
  isOnline?: boolean;
  backendAvailable?: boolean;
  now?: Date;
}): boolean {
  if (params.isOnline === false) return false;
  if (params.backendAvailable === false || !isQuoteBackendAvailable()) return false;
  if (!canViewQuotation(params.quotation, params.eligibleCompanyId)) return false;
  if (params.quotation.status !== "ISSUED") return false;
  if (isQuotationExpired(params.quotation, params.now)) return false;
  if (params.declining) return false;
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

export const QUOTE_BACKEND_UNAVAILABLE_MESSAGE =
  "Quotation requests are not available in the app yet. Use Support for catalogue or account enquiries while Core contracts are prepared.";
