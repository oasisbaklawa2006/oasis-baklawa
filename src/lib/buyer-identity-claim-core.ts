// Pure logic for the Buyer identity claim outcome, split out from
// buyer-identity-claim.ts specifically so it can be unit tested without
// pulling in @/lib/supabase (and transitively react-native) at module load
// time — matching this repo's existing test convention (see rpc.test.ts,
// which type-checks callRpc without importing its runtime implementation).
export const APPROVED_B2B_IDENTITY_CLAIM_RPC = "claim_approved_b2b_access_request_v2";

export interface ApprovedB2bIdentityClaimRow {
  application_id: string | null;
  claimed: boolean;
  company_id: string | null;
  already_active: boolean;
}

export interface ApprovedB2bIdentityClaimOutcome {
  applicationId: string | null;
  companyId: string | null;
  claimed: boolean;
  alreadyActive: boolean;
}

const NO_MATCH_CLAIM_ROW: ApprovedB2bIdentityClaimRow = {
  application_id: null,
  claimed: false,
  company_id: null,
  already_active: false,
};

export function isApprovedB2bIdentityClaimRow(value: unknown): value is ApprovedB2bIdentityClaimRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    Object.prototype.hasOwnProperty.call(row, "application_id") &&
    Object.prototype.hasOwnProperty.call(row, "claimed") &&
    Object.prototype.hasOwnProperty.call(row, "company_id") &&
    Object.prototype.hasOwnProperty.call(row, "already_active") &&
    (row.application_id === null || typeof row.application_id === "string") &&
    typeof row.claimed === "boolean" &&
    (row.company_id === null || typeof row.company_id === "string") &&
    typeof row.already_active === "boolean"
  );
}

/** Core may return an empty set when no b2b_applications match exists yet for auth.uid(). */
export function normalizeClaimRpcData(data: unknown): ApprovedB2bIdentityClaimRow | null {
  if (Array.isArray(data)) {
    if (data.length === 0) return NO_MATCH_CLAIM_ROW;
    if (data.length === 1) return isApprovedB2bIdentityClaimRow(data[0]) ? data[0] : null;
    return null;
  }
  return isApprovedB2bIdentityClaimRow(data) ? data : null;
}

export function classifyClaimRpcError(message?: string | null): string {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("ambiguous") || normalized.includes("conflict")) return "ambiguous";
  return "rpc_error";
}

/**
 * Fail closed when the edge bridge signalled a brand-new identity awaiting
 * bind (approved_b2b_pending_claim / is_new) but Core's claim did not attach
 * membership. Prevents a silent fall-through to "no application" for a real
 * approved buyer — this is the deadlock guard at the claim layer.
 */
export function assertApprovedB2bClaimBound(
  outcome: ApprovedB2bIdentityClaimOutcome,
  requireBound: boolean
): void {
  if (!requireBound) return;
  if (outcome.claimed || outcome.alreadyActive) return;
  throw new Error("APPROVED_B2B_IDENTITY_CLAIM_FAILED:bind_failed");
}
