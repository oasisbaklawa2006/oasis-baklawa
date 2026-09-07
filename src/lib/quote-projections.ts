import type {
  CustomerQuotationDetail,
  CustomerQuotationLine,
  CustomerQuotationSummary,
} from "@/types/quote-contract";
import { QUOTATION_STATUSES } from "@/types/quote-contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function requiredString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function requiredNumber(value: unknown): number | null {
  const n = nullableNumber(value);
  return n === null ? null : n;
}

function normalizeQuotationStatus(value: unknown): string {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  return QUOTATION_STATUSES.includes(status as (typeof QUOTATION_STATUSES)[number]) ? status : status || "issued";
}

export function normalizeCustomerQuotationSummary(value: unknown): CustomerQuotationSummary | null {
  if (!isRecord(value)) return null;
  const quotationId = requiredString(value.quotation_id);
  const quotationNumber = nullableString(value.quotation_number);
  const expiresAt = requiredString(value.expires_at);
  const createdAt = requiredString(value.created_at);
  const updatedAt = requiredString(value.updated_at);
  const currentVersion = requiredNumber(value.current_version);
  const quotationValue = requiredNumber(value.quotation_value);
  const advanceRequired = requiredNumber(value.advance_required);
  if (
    !quotationId ||
    !quotationNumber ||
    !expiresAt ||
    !createdAt ||
    !updatedAt ||
    currentVersion === null ||
    quotationValue === null ||
    advanceRequired === null
  ) {
    return null;
  }
  return {
    quotation_id: quotationId,
    quotation_number: quotationNumber,
    status: normalizeQuotationStatus(value.status),
    current_version: currentVersion,
    quotation_value: quotationValue,
    advance_required: advanceRequired,
    expires_at: expiresAt,
    is_actionable: value.is_actionable === true,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function normalizeCustomerQuotationDetail(value: unknown): CustomerQuotationDetail | null {
  if (!isRecord(value)) return null;
  const quotationId = requiredString(value.quotation_id);
  const quotationNumber = nullableString(value.quotation_number);
  const versionId = requiredString(value.version_id);
  const expiresAt = requiredString(value.expires_at);
  const createdAt = requiredString(value.created_at);
  const updatedAt = requiredString(value.updated_at);
  const currentVersion = requiredNumber(value.current_version);
  const quotationValue = requiredNumber(value.quotation_value);
  const advanceRequired = requiredNumber(value.advance_required);
  if (
    !quotationId ||
    !quotationNumber ||
    !versionId ||
    !expiresAt ||
    !createdAt ||
    !updatedAt ||
    currentVersion === null ||
    quotationValue === null ||
    advanceRequired === null
  ) {
    return null;
  }
  const termsSnapshot = isRecord(value.terms_snapshot) ? value.terms_snapshot : null;
  const commercialSnapshot = Array.isArray(value.commercial_snapshot) ? value.commercial_snapshot : null;
  return {
    quotation_id: quotationId,
    quotation_number: quotationNumber,
    status: normalizeQuotationStatus(value.status),
    current_version: currentVersion,
    version_id: versionId,
    quotation_value: quotationValue,
    advance_required: advanceRequired,
    expires_at: expiresAt,
    is_actionable: value.is_actionable === true,
    request_notes: nullableString(value.request_notes),
    terms_snapshot: termsSnapshot,
    commercial_snapshot: commercialSnapshot,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function normalizeCustomerQuotationLine(value: unknown): CustomerQuotationLine | null {
  if (!isRecord(value)) return null;
  const lineId = requiredString(value.line_id);
  const productId = requiredString(value.product_id);
  const sku = nullableString(value.sku);
  const productName = nullableString(value.product_name);
  const quantity = requiredNumber(value.quantity);
  const unitPrice = requiredNumber(value.unit_price);
  const lineTotal = requiredNumber(value.line_total);
  const currency = nullableString(value.currency);
  const versionNumber = requiredNumber(value.version_number);
  if (
    !lineId ||
    !productId ||
    !productName ||
    quantity === null ||
    unitPrice === null ||
    lineTotal === null ||
    !currency ||
    versionNumber === null
  ) {
    return null;
  }
  return {
    line_id: lineId,
    product_id: productId,
    sku,
    product_name: productName,
    quantity,
    unit_price: unitPrice,
    line_total: lineTotal,
    currency,
    uom: nullableString(value.uom),
    gst_rate: nullableNumber(value.gst_rate),
    tax_inclusive: value.tax_inclusive === true,
    minimum_order_quantity: nullableNumber(value.minimum_order_quantity),
    order_increment: nullableNumber(value.order_increment),
    min_carton_qty: nullableNumber(value.min_carton_qty),
    version_number: versionNumber,
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

export function termsSnapshotLabel(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;
  const validityDays = snapshot.validity_days;
  const currency = snapshot.currency;
  if (typeof validityDays === "number" && typeof currency === "string") {
    return `${validityDays}-day validity · ${currency}`;
  }
  return null;
}
