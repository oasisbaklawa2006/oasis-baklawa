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
