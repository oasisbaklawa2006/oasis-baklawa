#!/usr/bin/env node
/**
 * Disposable authenticated mobile golden-path certification.
 * Consumes a short-lived 0600 session artifact prepared outside Node.
 * Read-only RPC probes only; no order/general-query/favourite mutations.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const READ_RPCS = [
  "customer_sales_order_commercial_facts_v1",
  "customer_proforma_invoice_facts_v1",
  "customer_documents_v1",
  "customer_statement_v1",
  "customer_product_favourites_v1",
  "customer_general_queries_v1",
  "customer_support_tickets_v1",
  "customer_order_status_v1",
];

const sessionFile = process.env.BUYER_CERT_SESSION_FILE;
const requireAuth =
  process.env.BUYER_CERT_REQUIRE_AUTH === "true" ||
  process.env.GITHUB_ACTIONS === "true" ||
  process.env.CI === "true";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function missingSecretGate() {
  fail(
    [
      "HUMAN GATE — authenticated Buyer Mobile golden-path certification is blocked.",
      "Configure repository secrets:",
      "  - BUYER_CERT_EMAIL",
      "  - BUYER_CERT_PASSWORD",
      "  - EXPO_PUBLIC_SUPABASE_URL",
      "  - EXPO_PUBLIC_SUPABASE_ANON_KEY",
      "Then rerun prepare-cert-session.sh / Buyer Mobile Golden Path Certification workflow.",
      "Skipped authentication is NOT PASS for Tranche-5 closure.",
    ].join("\n")
  );
}

function companyContextGate(userId, detail) {
  fail(
    [
      "HUMAN GATE — authenticated Buyer Mobile golden-path certification is blocked on buyer company context.",
      `Authenticated certification user: ${userId}`,
      detail ? `Probe detail: ${detail}` : null,
      "",
      "Root cause: customer_statement_v1 fail-closes when customer_buyer_eligible_company_id() is NULL.",
      "Required governed identity chain (Core): auth.users → public.profiles → public.companies.",
      "",
      "Buyer-owned prep (already attempted in CI when applicable):",
      "  submit_b2b_trade_application_v1 — creates pending application + pending_buyer profile.",
      "",
      "Single Central-owned human action required (cannot be executed from Buyer repo CI):",
      "  Approve the pending B2B trade application for this certification Auth user in Oasis Central",
      "  (Admin → Clients → Approve), which calls approve_b2b_trade_application_v1 as internal staff.",
      "",
      "Canonical post-approval state:",
      "  profiles.id = certification auth uid",
      "  profiles.company_id = application.resolved_company_id",
      "  profiles.role = 'b2b_buyer'",
      "  profiles.is_approved = true",
      "  profiles.status = 'approved'",
      "  companies.status = 'active'",
      "  companies.is_frozen = false",
      "",
      "Do not weaken customer_buyer_eligible_company_id(), bypass eligibility, or direct-write production tables.",
      "Then re-run Buyer Mobile Golden Path Certification.",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function loadSessionArtifact(path) {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw);
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

function removeSessionArtifact(path) {
  try {
    unlinkSync(path);
  } catch {
    // Best-effort cleanup only.
  }
}

if (!sessionFile) {
  if (requireAuth) missingSecretGate();
  console.log("BUYER_CERT_SESSION_FILE not set — skipping authenticated RPC certification.");
  process.exit(0);
}

let session;
try {
  session = loadSessionArtifact(sessionFile);
} catch (error) {
  if (requireAuth) {
    fail(`Session artifact could not be loaded: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  console.log("Session artifact unavailable — skipping authenticated RPC certification.");
  process.exit(0);
}

const supabase = createClient(session.supabaseUrl, session.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken ?? "",
  });
  if (sessionError) fail(`Authenticated session could not be established: ${sessionError.message}`);

  console.log(`Authenticated buyer certification user: ${session.userId}`);

  const evidence = {
    authenticatedUserId: session.userId,
    readOnly: true,
    rpcResults: [],
    projectionChecks: [],
  };

  const results = [];
  for (const rpc of READ_RPCS) {
    const { data, error } = await supabase.rpc(rpc);
    if (error) {
      results.push({ rpc, ok: false, detail: error.message });
      evidence.rpcResults.push({ rpc, ok: false, detail: error.message });
      continue;
    }
    const detail = Array.isArray(data) ? `rows=${data.length}` : typeof data;
    results.push({ rpc, ok: true, detail });
    evidence.rpcResults.push({ rpc, ok: true, detail });
  }

  const { data: orders, error: ordersError } = await supabase.rpc("customer_order_status_v1");
  if (ordersError) fail(`customer_order_status_v1 failed: ${ordersError.message}`);

  const orderId = orders?.[0]?.order_id;
  if (orderId) {
    const { data: financeData, error: financeError } = await supabase.rpc("customer_order_finance_facts_v1", {
      p_order_id: orderId,
    });
    results.push({
      rpc: "customer_order_finance_facts_v1",
      ok: !financeError,
      detail: financeError?.message ?? `order=${orderId}`,
    });
    evidence.rpcResults.push({
      rpc: "customer_order_finance_facts_v1",
      ok: !financeError,
      detail: financeError?.message ?? `order=${orderId}`,
    });
    if (!financeError && financeData && typeof financeData === "object") {
      evidence.projectionChecks.push({
        surface: "finance_facts",
        customerSafeFlag: financeData.customer_safe_projection === true,
        hasOrderNumber: typeof financeData.order_number === "string",
      });
    }
  } else {
    results.push({
      rpc: "customer_order_finance_facts_v1",
      ok: true,
      detail: "skipped — no orders to probe",
    });
    evidence.rpcResults.push({
      rpc: "customer_order_finance_facts_v1",
      ok: true,
      detail: "skipped — no orders to probe",
    });
  }

  const { data: statementData, error: statementError } = await supabase.rpc("customer_statement_v1");
  if (statementError) {
    results.push({ rpc: "customer_statement_v1_probe", ok: false, detail: statementError.message });
  } else if (statementData && typeof statementData === "object") {
    evidence.projectionChecks.push({
      surface: "statement",
      statementFactsOnly: statementData.statement_facts_only === true,
      entryCount: Array.isArray(statementData.entries) ? statementData.entries.length : 0,
    });
  }

  evidence.projectionChecks.push({
    surface: "communication_log",
    detail: "client merge of customer_support_tickets_v1 + customer_general_queries_v1 covered by unit tests",
  });

  const failed = results.filter((row) => !row.ok);
  for (const row of results) {
    console.log(`${row.ok ? "PASS" : "FAIL"} ${row.rpc} ${row.detail}`);
  }

  const companyContextFailure = failed.find((row) =>
    String(row.detail).includes("CUSTOMER_STATEMENT_COMPANY_CONTEXT_REQUIRED")
  );
  if (companyContextFailure) {
    companyContextGate(session.userId, companyContextFailure.detail);
  }

  await supabase.auth.signOut();

  try {
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    writeFileSync(
      join("/opt/cursor/artifacts", "buyer-mobile-golden-path-cert.json"),
      `${JSON.stringify(evidence, null, 2)}\n`
    );
  } catch {
    // Evidence file is best-effort outside cloud agent runs.
  }

  if (failed.length) {
    fail(`Authenticated golden-path certification failed for ${failed.length} RPC(s).`);
  }

  console.log("Authenticated mobile golden-path certification passed (read-only).");
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  removeSessionArtifact(sessionFile);
}
