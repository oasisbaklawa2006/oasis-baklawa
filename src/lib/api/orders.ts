import { supabase } from "@/lib/supabase";
import type { CustomerOrderItem, CustomerOrderStatus } from "@/types/database.types";

export async function fetchCustomerOrderStatus(): Promise<CustomerOrderStatus[]> {
  const { data, error } = await supabase.rpc("customer_order_status_v1");
  if (error) throw error;
  return (data as CustomerOrderStatus[] | null) ?? [];
}

export async function fetchCustomerOrderItems(): Promise<CustomerOrderItem[]> {
  const { data, error } = await supabase.rpc("customer_order_items_v1");
  if (error) throw error;
  return (data as CustomerOrderItem[] | null) ?? [];
}
