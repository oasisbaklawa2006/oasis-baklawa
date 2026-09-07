import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectGovernedRpcInvocations } from "../../src/lib/quote-rpc-binding-check.ts";
import { REQUIRED_RPC_BINDINGS } from "../../src/lib/required-rpc-bindings.ts";

const gatewaySource = readFileSync(join(process.cwd(), "src/services/customerGateway.ts"), "utf8");
const quotesSource = readFileSync(join(process.cwd(), "src/lib/api/quotes.ts"), "utf8");
const boundarySource = readFileSync(join(process.cwd(), "scripts/verify-contract-boundary.mjs"), "utf8");
const documentsSource = readFileSync(join(process.cwd(), "src/screens/DocumentsScreen.tsx"), "utf8");
const supportSource = readFileSync(join(process.cwd(), "src/screens/SupportScreen.tsx"), "utf8");
const quotationsSource = readFileSync(join(process.cwd(), "src/screens/QuotationsScreen.tsx"), "utf8");
const paymentSource = readFileSync(join(process.cwd(), "src/lib/api/payment-gateway.ts"), "utf8");
const finalPaymentSource = readFileSync(join(process.cwd(), "src/lib/api/final-payment.ts"), "utf8");
const invokedRpcs = collectGovernedRpcInvocations(
  `${gatewaySource}\n${quotesSource}\n${paymentSource}\n${finalPaymentSource}`
);

const failures = [];

for (const rpc of REQUIRED_RPC_BINDINGS) {
  if (!invokedRpcs.has(rpc)) failures.push(`governed quote/api layer missing binding for ${rpc}`);
  if (!boundarySource.includes(`"${rpc}"`)) failures.push(`verify-contract-boundary missing allowlist entry for ${rpc}`);
}

if (/BLOCKED-BACKEND/.test(documentsSource)) failures.push("DocumentsScreen still contains BLOCKED-BACKEND stub");
if (!/customerGateway\.documents\(\)/.test(documentsSource)) failures.push("DocumentsScreen does not call customerGateway.documents()");
if (/orderId:\s*""/.test(supportSource)) failures.push("SupportScreen still submits empty order id");
if (!/submitGeneralQuery/.test(supportSource)) failures.push("SupportScreen does not route general support through submitGeneralQuery");
if (!/customerGateway\.quotations\(\)/.test(quotationsSource)) failures.push("QuotationsScreen does not call customerGateway.quotations()");

if (failures.length) {
  console.error("Tranche-5 binding verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Tranche-5 buyer gateway bindings verified.");
