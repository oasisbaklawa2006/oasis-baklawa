import type { CustomerQuotation, CustomerQuotationDetail, CustomerQuotationLine } from "@/types/quote-contract";
import { QUOTATION_STATUSES } from "@/types/quote-contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeQuotationStatus(value: unknown): string {
  const status = typeof value === "string" ? value.trim().toUpperCase() : "";
  return QUOTATION_STATUSES.includes(status as (typeof QUOTATION_STATUSES)[number]) ? status : "REQUESTED";
}

export function normalizeCustomerQuotationLine(value: unknown): CustomerQuotationLine | null {
  if (!isRecord(value)) return null;
  const quotationId = nullableString(value.quotation_id);
  const lineId = nullableString(value.line_id);
  const productId = nullableString(value.product_id);
  const sku = nullableString(value.sku);
  const productName = nullableString(value.product_name);
  const quantity = nullableNumber(value.quantity);
  if (!quotationId || !lineId || !productId || !sku || !productName || quantity === null) return null;
  return {
    quotation_id: quotationId,
    line_id: lineId,
    product_id: productId,
    sku,
    product_name: productName,
    quantity,
    unit_price: nullableNumber(value.unit_price),
    line_total: nullableNumber(value.line_total),
    uom: nullableString(value.uom),
  };
}

/** Normalizes Core customer-safe quotation facts without exposing arbitrary backend keys. */
export function normalizeCustomerQuotation(value: unknown): CustomerQuotation | null {
  if (!isRecord(value)) return null;
  const quotationId = nullableString(value.quotation_id);
  const quotationNumber = nullableString(value.quotation_number);
  const companyId = nullableString(value.company_id);
  if (!quotationId || !quotationNumber || !companyId) return null;
  return {
    quotation_id: quotationId,
    quotation_number: quotationNumber,
    company_id: companyId,
    status: normalizeQuotationStatus(value.status),
    commercial_version_id: nullableString(value.commercial_version_id),
    commercial_version_number: nullableNumber(value.commercial_version_number),
    frozen_customer_total: nullableNumber(value.frozen_customer_total),
    currency: nullableString(value.currency),
    expires_at: nullableString(value.expires_at),
    issued_at: nullableString(value.issued_at),
    created_at: nullableString(value.created_at) || "",
    updated_at: nullableString(value.updated_at) || "",
    customer_safe_projection: value.customer_safe_projection === true,
  };
}

export function normalizeCustomerQuotationDetail(value: unknown): CustomerQuotationDetail | null {
  const quotation = normalizeCustomerQuotation(value);
  if (!quotation || !isRecord(value)) return null;
  const lines = Array.isArray(value.lines)
    ? value.lines.map(normalizeCustomerQuotationLine).filter((line): line is CustomerQuotationLine => Boolean(line))
    : [];
  return {
    ...quotation,
    lines,
    terms_summary: nullableString(value.terms_summary),
    lead_time_summary: nullableString(value.lead_time_summary),
  };
}

export function customerQuotationStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function quotationExpiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "Validity pending review";
  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) return "Validity pending review";
  return `Valid until ${new Date(parsed).toLocaleDateString("en-IN", { dateStyle: "medium" })}`;
}
