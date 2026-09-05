import { readFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_BINDINGS = [
  "customer_sales_order_commercial_facts_v1",
  "customer_order_finance_facts_v1",
  "customer_proforma_invoice_facts_v1",
  "customer_documents_v1",
  "customer_statement_v1",
  "customer_product_favourites_v1",
  "set_customer_product_favourite_v1",
  "customer_general_queries_v1",
  "submit_customer_general_query_v1",
];

const gatewaySource = readFileSync(join(process.cwd(), "src/services/customerGateway.ts"), "utf8");
const boundarySource = readFileSync(join(process.cwd(), "scripts/verify-contract-boundary.mjs"), "utf8");
const documentsSource = readFileSync(join(process.cwd(), "src/screens/DocumentsScreen.tsx"), "utf8");
const supportSource = readFileSync(join(process.cwd(), "src/screens/SupportScreen.tsx"), "utf8");

const failures = [];

for (const rpc of REQUIRED_BINDINGS) {
  if (!gatewaySource.includes(`"${rpc}"`)) failures.push(`customerGateway missing binding for ${rpc}`);
  if (!boundarySource.includes(`"${rpc}"`)) failures.push(`verify-contract-boundary missing allowlist entry for ${rpc}`);
}

if (/BLOCKED-BACKEND/.test(documentsSource)) failures.push("DocumentsScreen still contains BLOCKED-BACKEND stub");
if (!/customerGateway\.documents\(\)/.test(documentsSource)) failures.push("DocumentsScreen does not call customerGateway.documents()");
if (/orderId:\s*""/.test(supportSource)) failures.push("SupportScreen still submits empty order id");
if (!/submitGeneralQuery/.test(supportSource)) failures.push("SupportScreen does not route general support through submitGeneralQuery");

if (failures.length) {
  console.error("Tranche-5 binding verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Tranche-5 buyer gateway bindings verified.");
