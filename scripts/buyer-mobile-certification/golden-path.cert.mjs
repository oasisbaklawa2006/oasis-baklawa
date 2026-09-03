#!/usr/bin/env node
/**
 * Disposable authenticated mobile golden-path certification.
 * Read-only against production/staging when credentials are supplied.
 * No order submission, no general-query mutation, no favourite mutation.
 */
import { createClient } from "@supabase/supabase-js";

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
const email = process.env.BUYER_CERT_EMAIL;
const password = process.env.BUYER_CERT_PASSWORD;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!email || !password) {
  console.log("BUYER_CERT_EMAIL/PASSWORD not set — skipping authenticated RPC certification.");
  process.exit(0);
}

if (!url || !anonKey) {
  fail("Missing Supabase URL/anon key. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) fail(`Authentication failed: ${authError.message}`);

console.log(`Authenticated buyer certification user: ${authData.user?.id ?? "unknown"}`);

const results = [];
for (const rpc of READ_RPCS) {
  const { data, error } = await supabase.rpc(rpc);
  if (error) {
    results.push({ rpc, ok: false, detail: error.message });
    continue;
  }
  results.push({ rpc, ok: true, detail: Array.isArray(data) ? `rows=${data.length}` : typeof data });
}

const { data: orders, error: ordersError } = await supabase.rpc("customer_order_status_v1");
if (ordersError) fail(`customer_order_status_v1 failed: ${ordersError.message}`);

const orderId = orders?.[0]?.order_id;
if (orderId) {
  const { error: financeError } = await supabase.rpc("customer_order_finance_facts_v1", { p_order_id: orderId });
  results.push({
    rpc: "customer_order_finance_facts_v1",
    ok: !financeError,
    detail: financeError?.message ?? `order=${orderId}`,
  });
} else {
  results.push({
    rpc: "customer_order_finance_facts_v1",
    ok: true,
    detail: "skipped — no orders to probe",
  });
}

const failed = results.filter((row) => !row.ok);
for (const row of results) {
  console.log(`${row.ok ? "PASS" : "FAIL"} ${row.rpc} ${row.detail}`);
}

await supabase.auth.signOut();

if (failed.length) {
  fail(`Authenticated golden-path certification failed for ${failed.length} RPC(s).`);
}

console.log("Authenticated mobile golden-path certification passed (read-only).");
