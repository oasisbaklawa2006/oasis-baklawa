import { callRpc } from "@/lib/rpc";
import { normalizeCustomerFinalPaymentRequest } from "@/lib/customer-projections";
import type { CustomerFinalPaymentRequest } from "@/types/database.types";

export async function fetchCustomerFinalPaymentRequest(
  orderId: string
): Promise<CustomerFinalPaymentRequest | null> {
  return normalizeCustomerFinalPaymentRequest(
    await callRpc("get_sales_order_pi_final_payment_request_v1", { p_order_id: orderId })
  );
}
