import {
  addCustomerOrderDraftLineReturningId,
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
};
