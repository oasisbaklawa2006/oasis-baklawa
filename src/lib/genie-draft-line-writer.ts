import {
  addCustomerOrderDraftLineReturningId,
  getCustomerOrderDraft,
  removeCustomerOrderDraftLine,
  updateCustomerOrderDraftLine,
} from "@/lib/api/draft";
import type { GenieDraftLineWriter } from "@/lib/genie-draft-line-commit";

async function matchingDraftLineIds(productId: string, quantity: number): Promise<string[]> {
  const draft = await getCustomerOrderDraft();
  if (!draft?.lines?.length) return [];
  return draft.lines
    .filter((line) => line.product_id === productId && line.quantity === quantity)
    .map((line) => line.line_id);
}

export const genieDraftLineWriter: GenieDraftLineWriter = {
  add: addCustomerOrderDraftLineReturningId,
  update: async (draftLineId, quantity) => {
    await updateCustomerOrderDraftLine(draftLineId, quantity);
  },
  remove: async (draftLineId) => {
    await removeCustomerOrderDraftLine(draftLineId);
  },
  listReplacementDraftLineIds: matchingDraftLineIds,
  findReplacementDraftLineId: async (productId, quantity, excludedDraftLineIds = []) => {
    const excluded = new Set(excludedDraftLineIds);
    const matches = (await matchingDraftLineIds(productId, quantity)).filter((lineId) => !excluded.has(lineId));
    return matches.length === 1 ? matches[0] : null;
  },
};
