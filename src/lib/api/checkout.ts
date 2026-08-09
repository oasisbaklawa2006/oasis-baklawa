import { supabase } from "@/lib/supabase";
import type { SubmitCustomerOrderResult } from "@/types/database.types";

export async function calculateCustomerAdvance(salesOrderValue: number): Promise<number> {
  const { data, error } = await supabase.rpc("calculate_customer_advance_v1", {
    p_sales_order_value: salesOrderValue,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function submitCustomerOrder(
  idempotencyKey: string,
  requestedDispatchDate?: string | null
): Promise<SubmitCustomerOrderResult> {
  const { data, error } = await supabase.rpc("submit_customer_order_v1", {
    p_idempotency_key: idempotencyKey,
    p_requested_dispatch_date: requestedDispatchDate ?? null,
  });
  if (error) throw error;
  const rows = data as SubmitCustomerOrderResult[] | null;
  const result = rows?.[0];
  if (!result) throw new Error("CHECKOUT_FAILED: no order was returned from checkout");
  return result;
}
