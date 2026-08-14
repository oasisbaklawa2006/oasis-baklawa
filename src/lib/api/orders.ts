import { callRpc } from "@/lib/rpc";
import type { CustomerOrderItem, CustomerOrderStatus } from "@/types/database.types";

export async function fetchCustomerOrderStatus(): Promise<CustomerOrderStatus[]> {
  const data = await callRpc("customer_order_status_v1");
  return data ?? [];
}

export async function fetchCustomerOrderItems(): Promise<CustomerOrderItem[]> {
  const data = await callRpc("customer_order_items_v1");
  return data ?? [];
}
