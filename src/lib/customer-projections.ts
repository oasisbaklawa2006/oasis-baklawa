import type {
  CustomerCommercialFacts,
  CustomerDocument,
  CustomerFinanceFacts,
  CustomerGeneralQuery,
  CustomerProformaInvoiceFacts,
  CustomerStatement,
  CustomerStatementEntry,
} from "@/types/database.types";

export const GENERAL_QUERY_CATEGORIES = ["GENERAL", "CATALOGUE", "ACCOUNT", "DELIVERY", "OTHER"] as const;
export type CustomerGeneralQueryCategory = (typeof GENERAL_QUERY_CATEGORIES)[number];

const GENERAL_QUERY_STATUSES = ["SUBMITTED", "ACKNOWLEDGED", "RESOLVED", "CLOSED"] as const;

const CANONICAL_SUPPORT_ISSUE_TYPES: Record<string, string> = {
  "damaged goods": "Damaged Goods",
  "missing items": "Missing Items",
  "wrong shipment": "Wrong Shipment",
  "delivery question": "Other",
  "other order question": "Other",
  other: "Other",
};

/** Normalizes Buyer-facing labels to the established support-ticket payload vocabulary. */
export function canonicalSupportIssueType(issueType: string): string {
  return CANONICAL_SUPPORT_ISSUE_TYPES[issueType.trim().toLowerCase()] || "Other";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** Normalizes Core's customer-safe Finance JSON without exposing arbitrary backend keys. */
export function normalizeCustomerFinanceFacts(value: unknown): CustomerFinanceFacts | null {
  if (!isRecord(value)) return null;
  const orderId = nullableString(value.order_id);
  const orderNumber = nullableString(value.order_number);
  if (!orderId || !orderNumber) return null;
  return {
    order_id: orderId,
    order_number: orderNumber,
    commercial_version_id: nullableString(value.commercial_version_id),
    commercial_version_number: nullableNumber(value.commercial_version_number),
    commercial_value: nullableNumber(value.commercial_value),
    required_advance: nullableNumber(value.required_advance),
    pi_id: nullableString(value.pi_id),
    pi_number: nullableString(value.pi_number),
    pi_status: nullableString(value.pi_status),
    verified_payment_amount: nullableNumber(value.verified_payment_amount),
    wallet_applied_amount: nullableNumber(value.wallet_applied_amount),
    approved_credit_amount: nullableNumber(value.approved_credit_amount),
    covered_amount: nullableNumber(value.covered_amount),
    advance_covered: nullableBoolean(value.advance_covered),
    finance_status: nullableString(value.finance_status),
    facts_as_of: nullableString(value.facts_as_of),
    customer_safe_projection: value.customer_safe_projection === true,
  };
}

function normalizeCustomerStatementEntry(value: unknown): CustomerStatementEntry | null {
  if (!isRecord(value)) return null;
  return {
    order_id: nullableString(value.order_id),
    invoice_date: nullableString(value.invoice_date),
    invoice_number: nullableString(value.invoice_number),
    invoice_gross_total: nullableNumber(value.invoice_gross_total),
    verified_payment_total: nullableNumber(value.verified_payment_total),
    wallet_applied_total: nullableNumber(value.wallet_applied_total),
    approved_credit_total: nullableNumber(value.approved_credit_total),
    credit_note_total: nullableNumber(value.credit_note_total),
    debit_note_total: nullableNumber(value.debit_note_total),
    refund_total: nullableNumber(value.refund_total),
    pre_dispatch_net_due: nullableNumber(value.pre_dispatch_net_due),
    complaint_window_status: nullableString(value.complaint_window_status),
    complaint_deadline: nullableString(value.complaint_deadline),
    commercially_closed: nullableBoolean(value.commercially_closed),
  };
}

/** Keeps only the documented customer statement facts and drops internal closure metadata. */
export function normalizeCustomerStatement(value: unknown): CustomerStatement | null {
  if (!isRecord(value)) return null;
  const companyId = nullableString(value.company_id);
  if (!companyId) return null;
  const entries = Array.isArray(value.entries)
    ? value.entries.map(normalizeCustomerStatementEntry).filter((entry): entry is CustomerStatementEntry => Boolean(entry))
    : [];
  return {
    company_id: companyId,
    wallet_balance: nullableNumber(value.wallet_balance),
    entries,
    facts_as_of: nullableString(value.facts_as_of),
    statement_facts_only: value.statement_facts_only === true,
  };
}

function normalizeGeneralQueryCategory(value: string): CustomerGeneralQueryCategory {
  const category = value.trim().toUpperCase() as CustomerGeneralQueryCategory;
  return GENERAL_QUERY_CATEGORIES.includes(category) ? category : "GENERAL";
}

function normalizeGeneralQueryStatus(value: unknown): string {
  const status = typeof value === "string" ? value.trim().toUpperCase() : "";
  return GENERAL_QUERY_STATUSES.includes(status as (typeof GENERAL_QUERY_STATUSES)[number]) ? status : "SUBMITTED";
}

export function normalizeCustomerGeneralQuery(value: unknown): CustomerGeneralQuery | null {
  if (!isRecord(value)) return null;
  const queryId = nullableString(value.query_id);
  const subject = nullableString(value.subject);
  const message = nullableString(value.message);
  if (!queryId || !subject || !message) return null;
  return {
    query_id: queryId,
    category: normalizeGeneralQueryCategory(typeof value.category === "string" ? value.category : "GENERAL"),
    subject,
    message,
    status: normalizeGeneralQueryStatus(value.status),
    created_at: nullableString(value.created_at) || "",
    updated_at: nullableString(value.updated_at) || "",
  };
}

export function customerGeneralQueryStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export type DocumentAvailability = "available" | "preparing" | "not-issued" | "upstream-unavailable";

export function documentStatusLabel(status: DocumentAvailability): string {
  if (status === "available") return "Available";
  if (status === "preparing") return "Preparing";
  if (status === "not-issued") return "Not yet issued";
  return "Not available yet";
}

export function documentAvailability(value: string | null | undefined): DocumentAvailability {
  if (value === "issued") return "available";
  if (value === "preparing") return "preparing";
  return "upstream-unavailable";
}

export function documentDetail(document: CustomerDocument | undefined, fallback: string): string {
  if (!document) return fallback;
  if (document.availability_state === "issued" && document.document_number) {
    return `Reference ${document.document_number} is available.`;
  }
  if (document.availability_state === "preparing") {
    return "This document is being prepared and will appear here when issued.";
  }
  return "This document is not available yet.";
}

export function proformaAvailability(
  invoice: CustomerProformaInvoiceFacts | undefined,
  document: CustomerDocument | undefined
): DocumentAvailability {
  if (invoice) {
    return invoice.status?.toUpperCase() === "ISSUED" && invoice.customer_visible_pi_number ? "available" : "preparing";
  }
  return document ? documentAvailability(document.availability_state) : "upstream-unavailable";
}

export function proformaDetail(
  invoice: CustomerProformaInvoiceFacts | undefined,
  document: CustomerDocument | undefined
): string {
  if (!invoice) {
    return document
      ? documentDetail(document, "This document will appear here when it is issued.")
      : "This document will appear here when it is issued.";
  }
  if (invoice.status?.toUpperCase() === "ISSUED" && invoice.customer_visible_pi_number) {
    return `Reference ${invoice.customer_visible_pi_number} is available.`;
  }
  return "This document is being prepared and will appear here when issued.";
}

export function formatInr(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

export function commercialFactsForOrder(
  facts: CustomerCommercialFacts[],
  orderId: string
): CustomerCommercialFacts | undefined {
  return facts.find((row) => row.order_id === orderId);
}
