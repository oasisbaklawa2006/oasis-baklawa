import { supabase } from "@/lib/supabase";
import { aggregateDraftRows } from "@/lib/draft-utils";
import type { CustomerOrderDraft, CustomerOrderDraftRow } from "@/types/database.types";

export async function getCustomerOrderDraft(): Promise<CustomerOrderDraft | null> {
  const { data, error } = await supabase.rpc("get_customer_order_draft_v1");
  if (error) throw error;
  return aggregateDraftRows((data as CustomerOrderDraftRow[] | null) ?? []);
}

export async function addCustomerOrderDraftLine(productId: string, quantity: number): Promise<CustomerOrderDraft | null> {
  const { error: mutationError } = await supabase.rpc("add_customer_order_draft_line_v1", {
    p_product_id: productId,
    p_quantity: quantity,
  });
  if (mutationError) throw mutationError;
  return getCustomerOrderDraft();
}

export async function updateCustomerOrderDraftLine(lineId: string, quantity: number): Promise<CustomerOrderDraft | null> {
  const { error: mutationError } = await supabase.rpc("update_customer_order_draft_line_v1", {
    p_line_id: lineId,
    p_quantity: quantity,
  });
  if (mutationError) throw mutationError;
  return getCustomerOrderDraft();
}

export async function removeCustomerOrderDraftLine(lineId: string): Promise<CustomerOrderDraft | null> {
  const { error: mutationError } = await supabase.rpc("remove_customer_order_draft_line_v1", {
    p_line_id: lineId,
  });
  if (mutationError) throw mutationError;
  return getCustomerOrderDraft();
}

export async function clearCustomerOrderDraft(): Promise<CustomerOrderDraft | null> {
  const { error: mutationError } = await supabase.rpc("clear_customer_order_draft_v1");
  if (mutationError) throw mutationError;
  return getCustomerOrderDraft();
}
