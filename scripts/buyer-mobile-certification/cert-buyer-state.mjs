/**
 * Shared governed certification buyer state for auto-resume lanes.
 * Phases:
 *   APPROVED — customer_buyer_eligible_company_id() is non-null; golden path may pass.
 *   PENDING_CENTRAL — pending b2b_applications row exists; fail closed until staff approval.
 *   NEEDS_SUBMIT — no eligibility and no pending row; governed submit required once.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const CERT_PENDING_APPLICATION_HINT =
  process.env.BUYER_CERT_APPLICATION_ID ?? "dc370b46-ae39-44ec-9d1c-4c4bcdc9a60c";
export const CENTRAL_APPROVAL_BLOCKER_ISSUE = "Oasis-Baklawa-Central#481";

export function loadSessionArtifact(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (
    typeof parsed.supabaseUrl !== "string" ||
    typeof parsed.anonKey !== "string" ||
    typeof parsed.accessToken !== "string" ||
    typeof parsed.userId !== "string"
  ) {
    throw new Error("Session artifact is missing required fields.");
  }
  return parsed;
}

export function getSessionFilePath() {
  return process.env.BUYER_CERT_SESSION_FILE ?? "/tmp/oasis-buyer-mobile-cert-session.json";
}

export async function createAuthenticatedCertClient(sessionFile = getSessionFilePath()) {
  if (!existsSync(sessionFile)) {
    return { session: null, supabase: null };
  }

  const session = loadSessionArtifact(sessionFile);
  const supabase = createClient(session.supabaseUrl, session.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken ?? "",
  });
  if (sessionError) {
    throw new Error(`Authenticated session could not be established: ${sessionError.message}`);
  }

  return { session, supabase };
}

export async function resolveCertBuyerState(supabase, userId) {
  const { data: eligibleCompanyId, error: eligibilityError } = await supabase.rpc(
    "customer_buyer_eligible_company_id"
  );
  if (eligibilityError) {
    throw new Error(`customer_buyer_eligible_company_id failed: ${eligibilityError.message}`);
  }

  if (eligibleCompanyId) {
    return {
      phase: "APPROVED",
      eligibleCompanyId,
      pendingApplications: [],
      approvedApplications: [],
    };
  }

  const { data: applications, error: applicationsError } = await supabase
    .from("b2b_applications")
    .select("id,status,resolved_company_id,business_name,mobile_number,contact_email,assigned_price_tier")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (applicationsError) {
    throw new Error(`b2b_applications census failed: ${applicationsError.message}`);
  }

  const pendingApplications = (applications ?? []).filter((row) => row.status === "pending");
  const approvedApplications = (applications ?? []).filter((row) => row.status === "approved");

  if (pendingApplications.length > 0) {
    return {
      phase: "PENDING_CENTRAL",
      eligibleCompanyId: null,
      pendingApplications,
      approvedApplications,
    };
  }

  return {
    phase: "NEEDS_SUBMIT",
    eligibleCompanyId: null,
    pendingApplications: [],
    approvedApplications,
  };
}

export function formatCertBuyerStateSummary(state, userId) {
  return {
    autoResumePhase: state.phase,
    authenticatedUserId: userId,
    eligibleCompanyId: state.eligibleCompanyId,
    pendingApplicationIds: state.pendingApplications.map((row) => row.id),
    approvedApplicationIds: state.approvedApplications.map((row) => row.id),
    certificationApplicationHint: CERT_PENDING_APPLICATION_HINT,
    centralApprovalBlockerIssue: state.phase === "PENDING_CENTRAL" ? CENTRAL_APPROVAL_BLOCKER_ISSUE : null,
  };
}
