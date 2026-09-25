// Native wrapper around Core's claim_approved_b2b_access_request_v2(), ported
// from Oasis-Baklawa-Central's src/lib/b2b-approved-identity-claim.ts. Core is
// the sole authority for the membership decision.
import { callRpc, callRpcWithAccessToken } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";
import {
  APPROVED_B2B_IDENTITY_CLAIM_RPC,
  classifyClaimRpcError,
  normalizeClaimRpcData,
  waitForExpectedAuthenticatedSession,
  type ApprovedB2bIdentityClaimOutcome,
} from "@/lib/buyer-identity-claim-core";

export {
  APPROVED_B2B_IDENTITY_CLAIM_RPC,
  assertApprovedB2bClaimBound,
  type ApprovedB2bIdentityClaimOutcome,
  type ApprovedB2bIdentityClaimRow,
} from "@/lib/buyer-identity-claim-core";

/**
 * Claims Buyer membership for a provider-verified session. First-login bridge
 * callers supply both the exact verified user ID and its verified access token;
 * recovery callers omit them and use the persisted authenticated session.
 */
export async function claimApprovedB2bIdentity(
  expectedUserId?: string,
  verifiedAccessToken?: string
): Promise<ApprovedB2bIdentityClaimOutcome> {
  if (expectedUserId && !verifiedAccessToken) {
    throw new Error("APPROVED_B2B_IDENTITY_CLAIM_FAILED:session_missing");
  }

  if (!expectedUserId) {
    const sessionReady = await waitForExpectedAuthenticatedSession(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session?.user?.id ?? null;
    });

    if (!sessionReady) {
      throw new Error("APPROVED_B2B_IDENTITY_CLAIM_FAILED:session_missing");
    }
  }

  let data: unknown;
  try {
    data =
      expectedUserId && verifiedAccessToken
        ? await callRpcWithAccessToken(verifiedAccessToken, APPROVED_B2B_IDENTITY_CLAIM_RPC)
        : await callRpc(APPROVED_B2B_IDENTITY_CLAIM_RPC);
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    throw new Error(`APPROVED_B2B_IDENTITY_CLAIM_FAILED:${classifyClaimRpcError(message)}`);
  }

  const row = normalizeClaimRpcData(data);
  if (!row) {
    const reason = Array.isArray(data) && data.length > 1 ? "ambiguous" : "malformed_response";
    throw new Error(`APPROVED_B2B_IDENTITY_CLAIM_FAILED:${reason}`);
  }

  return {
    applicationId: row.application_id,
    companyId: row.company_id,
    claimed: row.claimed,
    alreadyActive: row.already_active,
  };
}
