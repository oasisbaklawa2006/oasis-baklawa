#!/usr/bin/env node
/**
 * Governed certification buyer onboarding prep (auto-resumable).
 * APPROVED → no-op; PENDING_CENTRAL → no duplicate submit; NEEDS_SUBMIT → submit once.
 */
import { createHash } from "node:crypto";
import { appendFileSync, existsSync } from "node:fs";
import {
  CENTRAL_APPROVAL_BLOCKER_ISSUE,
  CERT_PENDING_APPLICATION_HINT,
  createAuthenticatedCertClient,
  formatCertBuyerStateSummary,
  getSessionFilePath,
  resolveCertBuyerState,
} from "./cert-buyer-state.mjs";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function writeStepSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  appendFileSync(summaryPath, `${markdown}\n`);
}

function deriveCertMobile(userId) {
  const override = process.env.BUYER_CERT_MOBILE_NUMBER?.trim();
  if (override) return override;
  const n = Number.parseInt(createHash("sha256").update(userId).digest("hex").slice(0, 12), 16);
  return String(9000000000 + (n % 999999999));
}

const sessionFile = getSessionFilePath();
if (!existsSync(sessionFile)) {
  console.log("ensure-cert-buyer-onboarding: session artifact missing; skipping.");
  process.exit(0);
}

let session;
let supabase;
try {
  ({ session, supabase } = await createAuthenticatedCertClient(sessionFile));
} catch (error) {
  fail(error instanceof Error ? error.message : "Session setup failed.");
}

if (!session || !supabase) {
  fail("Session artifact unavailable after load.");
}

const state = await resolveCertBuyerState(supabase, session.userId);
const summary = formatCertBuyerStateSummary(state, session.userId);
console.log(`Certification buyer auto-resume state: ${JSON.stringify(summary)}`);

writeStepSummary(
  [
    "## Certification buyer auto-resume state",
    "",
    `- Phase: **${summary.autoResumePhase}**`,
    `- Auth user: \`${summary.authenticatedUserId}\``,
    `- Eligible company: ${summary.eligibleCompanyId ? `\`${summary.eligibleCompanyId}\`` : "none"}`,
    `- Pending applications: ${summary.pendingApplicationIds.length ? summary.pendingApplicationIds.map((id) => `\`${id}\``).join(", ") : "none"}`,
    summary.centralApprovalBlockerIssue
      ? `- Central blocker: [Oasis-Baklawa-Central#481](https://github.com/oasisbaklawa2006/Oasis-Baklawa-Central/issues/481) (Pricing Slab selector invisible in Admin Clients sheet)`
      : null,
  ]
    .filter(Boolean)
    .join("\n")
);

if (state.phase === "APPROVED") {
  console.log(`AUTO_RESUME_READY — governed buyer company context established: ${state.eligibleCompanyId}`);
  process.exit(0);
}

if (state.phase === "PENDING_CENTRAL") {
  const pendingIds = state.pendingApplications.map((row) => row.id).join(", ");
  console.log(
    [
      "AUTO_RESUME_PENDING — governed application exists; skipping duplicate submit.",
      `Pending application ids: ${pendingIds}`,
      `Certification application hint: ${CERT_PENDING_APPLICATION_HINT}`,
      `Central approval blocked by ${CENTRAL_APPROVAL_BLOCKER_ISSUE} until Pricing Slab is selectable in Admin Clients.`,
      "Re-run this workflow after Central staff approval; golden-path certification will auto-pass when eligibility is established.",
    ].join("\n")
  );
  process.exit(0);
}

const certMobile = deriveCertMobile(session.userId);
const certEmail =
  process.env.BUYER_CERT_EMAIL?.trim() ||
  `buyer-cert-${createHash("sha256").update(session.userId).digest("hex").slice(0, 12)}@example.invalid`;
const submitArgs = {
  p_business_name: process.env.BUYER_CERT_BUSINESS_NAME ?? "BUYER MOBILE GOLDEN PATH CERTIFICATION",
  p_contact_name: "Buyer Mobile Certification",
  p_contact_email: certEmail,
  p_contact_phone: certMobile,
  p_gst_number: process.env.BUYER_CERT_GST_NUMBER ?? "99MOBCT0001CZ5",
  p_registered_address: "Synthetic certification buyer - not a production customer.",
  p_preferred_dispatch: null,
  p_preferred_dispatch_other_name: null,
  p_trade_declaration: true,
  p_data_consent: true,
};

const { data: submitData, error: submitError } = await supabase.rpc(
  "submit_b2b_access_request_v2",
  submitArgs
);
if (submitError) {
  fail(
    [
      `Governed B2B access-request submit failed for certification buyer ${session.userId}.`,
      `submit_b2b_access_request_v2: ${submitError.message}`,
      `mobile=${certMobile}`,
    ].join("\n")
  );
}

const result = submitData?.[0];
if (!result?.application_id) {
  fail(`submit_b2b_access_request_v2 returned no application row for ${session.userId}.`);
}

const afterSubmit = await resolveCertBuyerState(supabase, session.userId);
console.log(
  `Governed B2B access request ensured for ${session.userId}: application=${result.application_id} status=${result.application_status} duplicate=${result.duplicate} mobile=${certMobile}`
);
console.log(
  `Post-submit auto-resume state: ${JSON.stringify(formatCertBuyerStateSummary(afterSubmit, session.userId))}`
);
