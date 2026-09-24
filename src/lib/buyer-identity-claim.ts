// Native wrapper around Core's claim_approved_b2b_access_request_v2(), ported
// from Oasis-Baklawa-Central's src/lib/b2b-approved-identity-claim.ts. This is
// the CURRENT (20260914160000_auth01_verified_identifier_membership_compat.sql)
// dual verified-identifier definition: it activates Buyer membership from a
// provider-confirmed phone OR email, preserves legacy application bindings, and
// fails closed on ambiguous company matches. Do not reimplement this logic
// on-device — Core is the sole authority for the claim decision.
//
// All pure logic (row validation, outcome normalization, the fail-closed
// bound assertion and session-readiness retry policy) lives in
// buyer-identity-claim-core.ts, which has no supabase/react-native import and
// is unit tested directly. This file is only the IO: the actual RPC call and
// session read.
import { callRpc } from "@/lib/rpc";
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
 * Claims Buyer membership for the current authenticated, provider-verified
 * session. Safe to call after BOTH mobile and email session bridges — Core's
 * current definition matches on verified phone OR verified email. Throws on
 * genuine RPC failure or a malformed response; never invents a claim.
 *
 * expectedUserId is supplied by the token-hash bridge on first login so a
 * stale/different local session can never authorize the claim.
 */
export async function claimApprovedB2bIdentity(
  expectedUserId?: string
): Promise<ApprovedB2bIdentityClaimOutcome> {
  const sessionReady = await waitForExpectedAuthenticatedSession(
    async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session?.user?.id ?? null;
    },
    expectedUserId ?? null
  );

  if (!sessionReady) {
    throw new Error("APPROVED_B2B_IDENTITY_CLAIM_FAILED:session_missing");
  }

  let data: unknown;
  try {
    data = await callRpc(APPROVED_B2B_IDENTITY_CLAIM_RPC);
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
