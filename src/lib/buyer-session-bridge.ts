// Bridges an MSG91-verified access-token to the canonical Supabase Buyer
// session, ported from Oasis-Baklawa-Central's verifiedProviderSession
// (src/pages/BuyerLogin.tsx). Both channels go through Central's existing
// edge functions (msg91-otp, msg91-email-session) for server-side provider
// re-verification, then the SAME supabase.auth.verifyOtp({token_hash,
// type:"email"}) call Central uses to mint the session — this is not a new,
// parallel auth mechanism.
import { supabase } from "@/lib/supabase";
import {
  claimApprovedB2bIdentity,
  assertApprovedB2bClaimBound,
  type ApprovedB2bIdentityClaimOutcome,
} from "@/lib/buyer-identity-claim";

export type BuyerLoginChannel = "mobile" | "email";

export interface BuyerSessionBridgeResult {
  userId: string;
  claim: ApprovedB2bIdentityClaimOutcome;
}

interface EdgeBridgeResponse {
  ok?: boolean;
  error?: string;
  reason?: string;
  token_hash?: string;
  user_id?: string;
  email?: string;
  phone?: string;
  verified_email?: string;
  is_new?: boolean;
  approved_b2b_pending_claim?: boolean;
}

/**
 * Exchanges a provider-verified MSG91 access-token for a canonical Supabase
 * session, then claims Buyer membership. Throws on any failure — callers
 * must not assume partial success.
 */
export async function bridgeMsg91SessionAndClaim(
  channel: BuyerLoginChannel,
  accessToken: string,
  identifier: string,
  attemptId: string
): Promise<BuyerSessionBridgeResult> {
  const edgeFunction = channel === "mobile" ? "msg91-otp" : "msg91-email-session";
  const body =
    channel === "mobile"
      ? { mode: "verify_widget", accessToken, phone: identifier, attemptId }
      : { accessToken, email: identifier, attemptId };

  const { data, error } = await supabase.functions.invoke(edgeFunction, { body });
  if (error) throw new Error(error.message || "provider_verification_failed");

  const verifyRes = (data ?? {}) as EdgeBridgeResponse;
  if (!verifyRes.ok) throw new Error(verifyRes.error || verifyRes.reason || "provider_verification_failed");
  if (!verifyRes.token_hash || !verifyRes.user_id) throw new Error("session_token_missing");

  const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: verifyRes.token_hash,
    type: "email",
  });
  if (sessionError || !sessionData.user) {
    throw new Error(sessionError?.message || "session_create_failed");
  }
  if (sessionData.user.id !== verifyRes.user_id) {
    // The server-resolved MSG91 identity and the Supabase token must bind to
    // the same Auth user. Clear the just-created persisted session before
    // failing closed so a malformed/inconsistent handoff cannot leave a
    // different user authenticated on the device.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    throw new Error("session_identity_mismatch");
  }

  const claim = await claimApprovedB2bIdentity();
  assertApprovedB2bClaimBound(claim, Boolean(verifyRes.approved_b2b_pending_claim));

  return { userId: sessionData.user.id, claim };
}
