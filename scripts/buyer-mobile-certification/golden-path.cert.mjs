#!/usr/bin/env node
/**
 * Disposable authenticated mobile golden-path certification.
 * Read-only against production/staging when credentials are supplied.
 * No order submission, no general-query mutation, no favourite mutation.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
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

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const certEmail = process.env.BUYER_CERT_EMAIL;
const certPassword = process.env.BUYER_CERT_PASSWORD;
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
      "Skipped authentication is NOT PASS for Tranche-5 closure.",
    ].join("\n")
  );
}

if (!certEmail || !certPassword) {
  if (requireAuth) missingSecretGate();
  console.log("BUYER_CERT_EMAIL/PASSWORD not set — skipping authenticated RPC certification.");
  process.exit(0);
}

if (!url || !anonKey) {
  if (requireAuth) missingSecretGate();
  fail("Missing Supabase URL/anon key. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: certEmail,
  password: certPassword,
});
if (authError) fail(`Authentication failed: ${authError.message}`);

console.log(`Authenticated buyer certification user: ${authData.user?.id ?? "unknown"}`);

const evidence = {
  authenticatedUserId: authData.user?.id ?? null,
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
