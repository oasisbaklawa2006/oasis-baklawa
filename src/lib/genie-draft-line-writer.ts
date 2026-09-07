import {
  addCustomerOrderDraftLineReturningId,
  getCustomerOrderDraft,
  removeCustomerOrderDraftLine,
  updateCustomerOrderDraftLine,
} from "@/lib/api/draft";
import type { GenieDraftLineWriter } from "@/lib/genie-draft-line-commit";

export const genieDraftLineWriter: GenieDraftLineWriter = {
  add: addCustomerOrderDraftLineReturningId,
  update: async (draftLineId, quantity) => {
    await updateCustomerOrderDraftLine(draftLineId, quantity);
  },
  remove: async (draftLineId) => {
    await removeCustomerOrderDraftLine(draftLineId);
  },
  findReplacementDraftLineId: async (productId, quantity) => {
    const draft = await getCustomerOrderDraft();
    if (!draft?.lines?.length) return null;
    const matches = draft.lines.filter(
      (line) => line.product_id === productId && line.quantity === quantity
    );
    return matches.length === 1 ? matches[0].line_id : null;
  },
};
