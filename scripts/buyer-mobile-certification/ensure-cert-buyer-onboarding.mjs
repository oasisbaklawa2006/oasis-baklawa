#!/usr/bin/env node
/**
 * Governed certification buyer onboarding prep.
 * Matches RegisterScreen / submitB2bTradeApplication integration via supabase-js.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const sessionFile = process.env.BUYER_CERT_SESSION_FILE ?? "/tmp/oasis-buyer-mobile-cert-session.json";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function loadSessionArtifact(path) {
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

function deriveCertMobile(userId) {
  const override = process.env.BUYER_CERT_MOBILE_NUMBER?.trim();
  if (override) return override;
  const n = Number.parseInt(createHash("sha256").update(userId).digest("hex").slice(0, 12), 16);
  return String(9000000000 + (n % 999999999));
}

if (!existsSync(sessionFile)) {
  console.log("ensure-cert-buyer-onboarding: session artifact missing; skipping.");
  process.exit(0);
}

let session;
try {
  session = loadSessionArtifact(sessionFile);
} catch (error) {
  fail(`Session artifact could not be loaded: ${error instanceof Error ? error.message : "unknown error"}`);
}

const supabase = createClient(session.supabaseUrl, session.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: sessionError } = await supabase.auth.setSession({
  access_token: session.accessToken,
  refresh_token: session.refreshToken ?? "",
});
if (sessionError) fail(`Authenticated session could not be established: ${sessionError.message}`);

const { data: eligibleCompanyId, error: eligibilityError } = await supabase.rpc(
  "customer_buyer_eligible_company_id"
);
if (eligibilityError) fail(`customer_buyer_eligible_company_id failed: ${eligibilityError.message}`);
if (eligibleCompanyId) {
  console.log(`Certification buyer already has governed company context: ${eligibleCompanyId}`);
  process.exit(0);
}

const { data: pendingBefore, error: pendingBeforeError } = await supabase
  .from("b2b_applications")
  .select("id,status,resolved_company_id,business_name,mobile_number,contact_email")
  .eq("user_id", session.userId)
  .eq("status", "pending");
if (pendingBeforeError) fail(`Pending-application census failed: ${pendingBeforeError.message}`);
console.log(`Certification buyer pending-application census (before ensure): ${JSON.stringify(pendingBefore ?? [])}`);

if ((pendingBefore ?? []).length > 0) {
  console.log("Pending governed application already exists for certification buyer; skipping submit.");
  process.exit(0);
}

const certMobile = deriveCertMobile(session.userId);
const submitArgs = {
  p_business_name: process.env.BUYER_CERT_BUSINESS_NAME ?? "BUYER MOBILE GOLDEN PATH CERTIFICATION",
  p_gst_number: process.env.BUYER_CERT_GST_NUMBER ?? "99MOBCT0001CZ5",
  p_contact_person: "Buyer Mobile Certification",
  p_contact_email: process.env.BUYER_CERT_EMAIL ?? null,
  p_mobile_number: certMobile,
  p_city: "Certification City",
  p_registered_address: "Synthetic certification buyer - not a production customer.",
  p_trade_declaration: true,
  p_data_consent: true,
};

const { data: submitData, error: submitError } = await supabase.rpc(
  "submit_b2b_trade_application_v1",
  submitArgs
);
if (submitError) {
  fail(
    [
      `Governed trade-application submit failed for certification buyer ${session.userId}.`,
      `submit_b2b_trade_application_v1: ${submitError.message}`,
      `mobile=${certMobile}`,
    ].join("\n")
  );
}

const result = submitData?.[0];
if (!result?.application_id) {
  fail(`submit_b2b_trade_application_v1 returned no application row for ${session.userId}.`);
}

const { data: pendingAfter, error: pendingAfterError } = await supabase
  .from("b2b_applications")
  .select("id,status,resolved_company_id,business_name,mobile_number,contact_email")
  .eq("user_id", session.userId)
  .eq("status", "pending");
if (pendingAfterError) fail(`Pending-application census failed: ${pendingAfterError.message}`);

console.log(`Certification buyer pending-application census (after ensure): ${JSON.stringify(pendingAfter ?? [])}`);
console.log(
  `Governed trade application ensured for ${session.userId}: application=${result.application_id} status=${result.application_status} duplicate=${result.is_duplicate_submission} mobile=${certMobile}`
);
console.log(
  `Central visibility keys: b2b_applications.user_id=${session.userId} status=pending (Staff read all applications / is_internal_staff).`
);
