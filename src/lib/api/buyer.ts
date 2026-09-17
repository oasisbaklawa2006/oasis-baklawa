import { callRpc } from "@/lib/rpc";
import { parseRpcError } from "@/lib/rpc-errors";
import { supabase } from "@/lib/supabase";
import { claimApprovedB2bIdentity } from "@/lib/buyer-identity-claim";
import type {
  CustomerCompany,
  CustomerTeamMember,
  SubmitB2bAccessRequestArgs,
  SubmitB2bAccessRequestResult,
} from "@/types/database.types";

// PENDING / REJECTED / UNKNOWN / EMPLOYEE identities are blocked at the
// buyer-login-gateway preflight (see buyer-preflight.ts) and never reach OTP,
// so they never reach session resolution either. A session existing at all is
// therefore expected to represent an approved identity; "no_membership" is
// the fail-closed catch for the case where that invariant doesn't hold (e.g.
// backend state changed after login, or a pre-AUTH-01 legacy session).
export type BuyerEligibilityState =
  | "unauthenticated"
  | "approved_buyer"
  | "no_membership"
  | "backend_failure";

export interface BuyerSessionSnapshot {
  state: BuyerEligibilityState;
  companyId: string | null;
  company: CustomerCompany | null;
  message: string | null;
  userId: string | null;
}

export async function fetchBuyerEligibleCompanyId(): Promise<string | null> {
  const data = await callRpc("customer_buyer_eligible_company_id");
  return data ?? null;
}

export async function fetchCustomerCompany(): Promise<CustomerCompany | null> {
  const data = await callRpc("customer_company_v1");
  return data?.[0] ?? null;
}

export async function fetchCustomerTeam(): Promise<CustomerTeamMember[]> {
  const data = await callRpc("customer_team_v1");
  return data ?? [];
}

/**
 * Public, unauthenticated B2B access intake — submit_b2b_access_request_v2
 * (Core, granted to anon). Replaces the obsolete authenticated
 * submit_b2b_trade_application_v1 path. Idempotent on (email, mobile): a
 * resubmission returns the existing application with duplicate: true rather
 * than erroring or creating a conflicting record. There is no p_city
 * parameter — b2b_applications has no city column, so the native form must
 * not collect one (folding it into the address is explicitly not the
 * intended fix; if a city field becomes required, that's a Core schema/RPC
 * change, not a client workaround).
 */
export async function submitB2bAccessRequest(
  args: SubmitB2bAccessRequestArgs
): Promise<SubmitB2bAccessRequestResult> {
  const data = await callRpc("submit_b2b_access_request_v2", args);
  const result = data?.[0];
  if (!result) {
    throw new Error("Access request did not return a result. Please try again.");
  }
  return result;
}

/**
 * Backend-authoritative session resolution. No local-storage inference and no
 * probing of unrelated RPCs (e.g. cart-draft) to guess eligibility — both were
 * removed as obsolete (AUTH-01 native convergence). Every branch is derived
 * from server state: the current session, customer_buyer_eligible_company_id,
 * and the company's own frozen/status flag. Fails closed to "backend_failure"
 * or "no_membership" rather than ever assuming approval.
 */
export async function resolveBuyerSession(): Promise<BuyerSessionSnapshot> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return {
      state: "backend_failure",
      companyId: null,
      company: null,
      message: parseRpcError(sessionError).message,
      userId: null,
    };
  }

  const userId = sessionData.session?.user?.id ?? null;

  if (!sessionData.session || !userId) {
    return { state: "unauthenticated", companyId: null, company: null, message: null, userId: null };
  }

  try {
    let companyId = await fetchBuyerEligibleCompanyId();
    if (!companyId) {
      // Recovery for an interrupted identity claim: the OTP/session-bridge
      // step (buyer-session-bridge.ts) can succeed in creating a verified
      // Supabase session and then be interrupted (network drop, app
      // backgrounded/killed) before claimApprovedB2bIdentity() completes.
      // That leaves a real, provider-verified session with no buyer
      // membership -- previously a permanent dead end, since this resolver
      // only re-checked membership and never re-attempted the claim, so
      // "Try again" on SessionRecoveryScreen could never succeed and the
      // only way out was a full fresh login (new OTP) that most people
      // wouldn't think to do. The claim RPC is safe to call speculatively
      // here: it's a read-then-idempotent-activate operation keyed off the
      // session's own verified phone/email (see
      // claim_approved_b2b_access_request_v2's already_active handling), so
      // calling it on an already-claimed or genuinely-not-a-buyer session is
      // a harmless no-op, not a mutation risk.
      try {
        await claimApprovedB2bIdentity();
        companyId = await fetchBuyerEligibleCompanyId();
      } catch {
        // Genuinely nothing to claim, or a transient backend issue -- fall
        // through to the normal no_membership branch below either way.
      }
    }
    if (!companyId) {
      return {
        state: "no_membership",
        companyId: null,
        company: null,
        message:
          "We couldn't find an active buyer account for this login. If you recently applied for B2B access, contact Oasis support to confirm your approval status.",
        userId,
      };
    }

    const company = await fetchCustomerCompany();
    if (company?.is_frozen) {
      return {
        state: "no_membership",
        companyId,
        company,
        message: "Your company account is frozen. Contact Oasis Baklawa support.",
        userId,
      };
    }
    return { state: "approved_buyer", companyId, company, message: null, userId };
  } catch (error) {
    const parsed = parseRpcError(error);
    if (parsed.code === "AUTH_REQUIRED") {
      return { state: "unauthenticated", companyId: null, company: null, message: parsed.message, userId: null };
    }
    return {
      state: "backend_failure",
      companyId: null,
      company: null,
      message: parsed.message,
      userId,
    };
  }
}
