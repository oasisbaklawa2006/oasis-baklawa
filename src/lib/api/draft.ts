import { callRpc } from "@/lib/rpc";
import { aggregateDraftRows } from "@/lib/draft-utils";
import { bulkAddIfAbsent, isRpcFunctionMissing, type BulkAddOutcome } from "@/lib/draft-bulk-add";
import { existingQuantities, type BulkAddItem } from "@/lib/draft-add-guard";
import type {
  CustomerOrderDraft,
  DraftInsertIfAbsentResult,
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

/**
 * Atomic insert-if-absent (Core add_customer_order_draft_line_if_absent_v1). Unlike the upsert above it NEVER
 * replaces an existing line: inserted=false returns the quantity that is already in the cart.
 */
export async function addCustomerOrderDraftLineIfAbsent(productId: string, quantity: number): Promise<DraftInsertIfAbsentResult> {
  const data = await callRpc("add_customer_order_draft_line_if_absent_v1", { p_product_id: productId, p_quantity: quantity });
  const row = ((data as DraftInsertIfAbsentResult[] | null) ?? [])[0];
  if (!row?.line_id || typeof row.inserted !== "boolean") {
    throw new Error("add_customer_order_draft_line_if_absent_v1 returned an unexpected shape");
  }
  return row;
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

/** Bulk add that never overwrites an existing line (atomic in Core; guarded fallback only if that function is not deployed). */
export function addItemsToCartIfAbsent(items: readonly BulkAddItem[]): Promise<BulkAddOutcome> {
  return bulkAddIfAbsent(items, {
    addIfAbsent: async (productId, quantity) => {
      const r = await addCustomerOrderDraftLineIfAbsent(productId, quantity);
      return { inserted: r.inserted, existingQuantity: Number(r.existing_quantity), lineId: r.line_id };
    },
    readQuantities: async () => existingQuantities(await getCustomerOrderDraft()),
    upsert: async (productId, quantity) => { await addCustomerOrderDraftLineReturningId(productId, quantity); },
    isFunctionMissing: isRpcFunctionMissing,
  });
}
