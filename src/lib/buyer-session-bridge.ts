// Bridges an MSG91-verified access-token to the canonical Supabase Buyer
// session. Both channels use the existing server-side provider verification
// and canonical Supabase token-hash exchange.
import { supabase } from "@/lib/supabase";
import { claimApprovedB2bIdentity } from "@/lib/buyer-identity-claim";
import {
  completeVerifiedBuyerSessionAndClaim,
  type BuyerSessionBridgeResult,
} from "@/lib/buyer-session-bridge-core";

export type BuyerLoginChannel = "mobile" | "email";
export type { BuyerSessionBridgeResult } from "@/lib/buyer-session-bridge-core";

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
 * session, then claims Buyer membership. Throws on any failure.
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

  return completeVerifiedBuyerSessionAndClaim(
    {
      tokenHash: verifyRes.token_hash,
      providerUserId: verifyRes.user_id,
      approvedB2bPendingClaim: Boolean(verifyRes.approved_b2b_pending_claim),
    },
    {
      verifyOtp: async (tokenHash) => {
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });
        return {
          userId: sessionData.user?.id ?? null,
          accessToken: sessionData.session?.access_token ?? null,
          refreshToken: sessionData.session?.refresh_token ?? null,
          errorMessage: sessionError?.message ?? null,
        };
      },
      setSession: async (sessionAccessToken, sessionRefreshToken) => {
        const { data: reboundData, error: reboundError } = await supabase.auth.setSession({
          access_token: sessionAccessToken,
          refresh_token: sessionRefreshToken,
        });
        return {
          userId: reboundData.session?.user.id ?? null,
          errorMessage: reboundError?.message ?? null,
        };
      },
      signOutLocal: async () => {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      },
      claimApprovedB2bIdentity,
    }
  );
}
