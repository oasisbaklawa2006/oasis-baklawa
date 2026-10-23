import { callRpc } from "@/lib/rpc";
import type { SubmitCustomerOrderResult } from "@/types/database.types";

export async function calculateCustomerAdvance(salesOrderValue: number): Promise<number> {
  const data = await callRpc("calculate_customer_advance_v1", { p_sales_order_value: salesOrderValue });
  return Number(data ?? 0);
}

export async function submitCustomerOrder(
  idempotencyKey: string,
  requestedDispatchDate?: string | null
): Promise<SubmitCustomerOrderResult> {
  const data = await callRpc("submit_customer_order_v1", {
    p_idempotency_key: idempotencyKey,
    p_requested_dispatch_date: requestedDispatchDate ?? null,
  });
  const result = data?.[0];
  if (!result) throw new Error("CHECKOUT_FAILED: no order was returned from checkout");
  return result;
}

/** Server-owned commercial quote; never calculate a final SO amount from the draft subtotal. */
export type AuthoritativeCheckoutQuote = {
  draft_id: string;
  lines: Array<Record<string, unknown>>;
  sales_order_value: number;
  advance_required: number;
  fingerprint: string;
};

export async function getAuthoritativeCheckoutQuote(): Promise<AuthoritativeCheckoutQuote> {
  const raw = await callRpc("customer_checkout_quote_v1", {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("QUOTE_UNAVAILABLE: server did not return a commercial quote");
  }
  const quote = raw as Record<string, unknown>;
  const total = typeof quote.sales_order_value === 'number' || (typeof quote.sales_order_value === 'string' && quote.sales_order_value.trim() !== '') ? Number(quote.sales_order_value) : NaN;
  const advance = typeof quote.advance_required === 'number' || (typeof quote.advance_required === 'string' && quote.advance_required.trim() !== '') ? Number(quote.advance_required) : NaN;
  if (typeof quote.draft_id !== "string" || !quote.draft_id ||
      !Array.isArray(quote.lines) || quote.lines.length === 0 ||
      !Number.isFinite(total) || total <= 0 ||
      !Number.isFinite(advance) || advance <= 0 ||
      typeof quote.fingerprint !== "string" || !/^[0-9a-f]{32}$/.test(quote.fingerprint)) {
    throw new Error("QUOTE_INVALID: server quote is incomplete");
  }
  return { draft_id: quote.draft_id, lines: quote.lines as Array<Record<string, unknown>>,
    sales_order_value: total, advance_required: advance, fingerprint: quote.fingerprint };
}

export async function submitQuotedCustomerOrder(
  idempotencyKey: string,
  approvedFingerprint: string,
  requestedDispatchDate?: string | null
): Promise<SubmitCustomerOrderResult> {
  if (!/^[0-9a-f]{32}$/.test(approvedFingerprint)) {
    throw new Error("QUOTE_APPROVAL_REQUIRED");
  }
  const data = await callRpc("submit_customer_order_quoted_v1", {
    p_idempotency_key: idempotencyKey,
    p_quote_fingerprint: approvedFingerprint,
    p_requested_dispatch_date: requestedDispatchDate ?? null,
  });
  const result = data?.[0];
  if (!result) throw new Error("CHECKOUT_FAILED: no order was returned from quoted checkout");
  return result;
}
