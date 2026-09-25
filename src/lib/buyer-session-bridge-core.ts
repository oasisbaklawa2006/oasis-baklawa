import {
  assertApprovedB2bClaimBound,
  type ApprovedB2bIdentityClaimOutcome,
} from "./buyer-identity-claim-core";

export interface BuyerSessionBridgeResult {
  userId: string;
  claim: ApprovedB2bIdentityClaimOutcome;
}

export interface VerifiedProviderSession {
  tokenHash: string;
  providerUserId: string;
  approvedB2bPendingClaim: boolean;
}

export interface VerifiedOtpSessionResult {
  userId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  errorMessage: string | null;
}

export interface ReboundSessionResult {
  userId: string | null;
  errorMessage: string | null;
}

export interface BuyerSessionBridgeCoreDeps {
  verifyOtp: (tokenHash: string) => Promise<VerifiedOtpSessionResult>;
  setSession: (accessToken: string, refreshToken: string) => Promise<ReboundSessionResult>;
  signOutLocal: () => Promise<void>;
  claimApprovedB2bIdentity: (
    expectedUserId: string,
    verifiedAccessToken: string
  ) => Promise<ApprovedB2bIdentityClaimOutcome>;
}

/**
 * Completes the security-sensitive post-provider Buyer handoff using injected
 * auth operations. The function is runtime-agnostic so fail-closed behavior can
 * be executed under the Node test harness while the native wrapper supplies
 * the real Supabase operations.
 */
export async function completeVerifiedBuyerSessionAndClaim(
  verified: VerifiedProviderSession,
  deps: BuyerSessionBridgeCoreDeps
): Promise<BuyerSessionBridgeResult> {
  const otpSession = await deps.verifyOtp(verified.tokenHash);
  if (
    otpSession.errorMessage ||
    !otpSession.userId ||
    !otpSession.accessToken ||
    !otpSession.refreshToken
  ) {
    throw new Error(otpSession.errorMessage || "session_create_failed");
  }

  if (otpSession.userId !== verified.providerUserId) {
    await deps.signOutLocal();
    throw new Error("session_identity_mismatch");
  }

  const rebound = await deps.setSession(otpSession.accessToken, otpSession.refreshToken);
  if (
    rebound.errorMessage ||
    !rebound.userId ||
    rebound.userId !== verified.providerUserId
  ) {
    await deps.signOutLocal();
    throw new Error(rebound.errorMessage || "session_create_failed");
  }

  const claim = await deps.claimApprovedB2bIdentity(
    verified.providerUserId,
    otpSession.accessToken
  );
  assertApprovedB2bClaimBound(claim, verified.approvedB2bPendingClaim);

  return { userId: otpSession.userId, claim };
}
