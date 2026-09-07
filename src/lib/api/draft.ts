import { callRpc } from "@/lib/rpc";
import { aggregateDraftRows } from "@/lib/draft-utils";
import type {
  CustomerOrderDraft,
  CustomerOrderDraftRow,
  DraftMutationResult,
} from "@/types/database.types";

export async function getCustomerOrderDraft(): Promise<CustomerOrderDraft | null> {
  const data = await callRpc("get_customer_order_draft_v1");
  return aggregateDraftRows((data as CustomerOrderDraftRow[] | null) ?? []);
}

export async function addCustomerOrderDraftLineReturningId(
  productId: string,
  quantity: number
): Promise<string> {
  const data = await callRpc("add_customer_order_draft_line_v1", {
    p_product_id: productId,
    p_quantity: quantity,
  });
  const rows = (data as DraftMutationResult[] | null) ?? [];
  const lineId = rows[0]?.line_id;
  if (!lineId) {
    throw new Error("add_customer_order_draft_line_v1 did not return a draft line id");
  }
  return lineId;
}

export async function addCustomerOrderDraftLine(productId: string, quantity: number): Promise<CustomerOrderDraft | null> {
  await addCustomerOrderDraftLineReturningId(productId, quantity);
  return getCustomerOrderDraft();
}

export async function updateCustomerOrderDraftLine(lineId: string, quantity: number): Promise<CustomerOrderDraft | null> {
  await callRpc("update_customer_order_draft_line_v1", {
    p_line_id: lineId,
    p_quantity: quantity,
  });
  return getCustomerOrderDraft();
}

export async function removeCustomerOrderDraftLine(lineId: string): Promise<CustomerOrderDraft | null> {
  await callRpc("remove_customer_order_draft_line_v1", { p_line_id: lineId });
  return getCustomerOrderDraft();
}

export async function clearCustomerOrderDraft(): Promise<CustomerOrderDraft | null> {
  await callRpc("clear_customer_order_draft_v1");
  return getCustomerOrderDraft();
}
