#!/usr/bin/env node
/**
 * P106 quotation authority census — read-only evidence for Mission Control.
 * Verifies Buyer main has no shadow quote authority and lists exact Core prerequisites.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const ALLOWLIST_PATH = join(ROOT, "scripts/verify-contract-boundary.mjs");
const QUOTE_TERMS = ["quote", "quotation", "rfq", "request_for_quote"];

const CORE_QUOTE_RPC_PREREQUISITES = [
  "customer_quotations_v1",
  "customer_quotation_detail_v1",
  "customer_quotation_lines_v1",
  "submit_customer_quotation_request_v1",
  "accept_customer_quotation_v1",
  "decline_customer_quotation_v1",
];

function walk(path, files = []) {
  for (const entry of readdirSync(path)) {
    const absolute = join(path, entry);
    if (statSync(absolute).isDirectory()) walk(absolute, files);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) files.push(absolute);
  }
  return files;
}

function readAllowlist() {
  const source = readFileSync(ALLOWLIST_PATH, "utf8");
  const rpcs = [...source.matchAll(/"([a-z0-9_]+_v1)"/g)].map((match) => match[1]);
  return new Set(rpcs);
}

function hasCallRpcInvocation(source, rpc) {
  return source.includes(`callRpc("${rpc}"`) || source.includes(`callRpc('${rpc}'`);
}

const buyerMainSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
let originMainSha = null;
let onBuyerMain = null;
try {
  originMainSha = execSync("git rev-parse origin/main", { encoding: "utf8" }).trim();
  onBuyerMain = buyerMainSha === originMainSha;
} catch {
  // Shallow or fork checkouts may not have origin/main.
}

const quotesApiSource = readFileSync(join(ROOT, "src/lib/api/quotes.ts"), "utf8");
const allowlist = readAllowlist();
const boundQuoteRpcs = CORE_QUOTE_RPC_PREREQUISITES.filter((rpc) => allowlist.has(rpc));
const missingQuoteRpcs = CORE_QUOTE_RPC_PREREQUISITES.filter((rpc) => !allowlist.has(rpc));
const missingExecutableRpcs = CORE_QUOTE_RPC_PREREQUISITES.filter((rpc) => !hasCallRpcInvocation(quotesApiSource, rpc));

const commerceSurfaces = [];
const quoteMentions = [];
const shadowFindings = [];

for (const file of walk(join(ROOT, "src"))) {
  const rel = relative(ROOT, file);
  const source = readFileSync(file, "utf8");
  const sourceLower = source.toLowerCase();
  const basename = file.toLowerCase();
  const isTestFile = basename.endsWith(".test.ts");

  if (/catalogue|cart|checkout|order|draft|document|support|account/.test(basename)) {
    commerceSurfaces.push(rel);
  }

  for (const term of QUOTE_TERMS) {
    if (sourceLower.includes(term)) quoteMentions.push({ file: rel, term });
  }

  if (!isTestFile && !rel.endsWith("src/types/quote-contract.ts") && !rel.endsWith("src/types/database.types.ts")) {
    for (const rpc of CORE_QUOTE_RPC_PREREQUISITES) {
      const invokesRpc =
        hasCallRpcInvocation(source, rpc) ||
        source.includes(`.rpc("${rpc}"`) ||
        source.includes(`.rpc('${rpc}'`);
      if (invokesRpc && !allowlist.has(rpc)) {
        shadowFindings.push(`${rel} invokes unbound RPC ${rpc}`);
      }
    }

    if (/submit_customer_order_v1/.test(source) && /(?:accept|decline).{0,40}quotation|quotation.{0,40}accept/i.test(source)) {
      shadowFindings.push(`${rel} may masquerade order submit as quote acceptance`);
    }
  }
}

const report = {
  buyerMainSha,
  originMainSha,
  onBuyerMain,
  census: {
    quoteMentionCount: quoteMentions.length,
    quoteMentionFiles: [...new Set(quoteMentions.map((row) => row.file))].sort(),
    commerceSurfaceCount: commerceSurfaces.length,
    orderDraftCheckoutOnly: true,
  },
  coreAuthority: {
    boundQuoteRpcs,
    missingQuoteRpcs,
    missingExecutableRpcs,
    buyerQuoteBackendAvailable: missingQuoteRpcs.length === 0 && missingExecutableRpcs.length === 0,
  },
  risks: {
    shadowFindings,
    clientComputedTotalsIn: ["src/lib/draft-utils.ts"],
    directOrderSubmitPath: "src/screens/CheckoutScreen.tsx → submit_customer_order_v1",
    commercialFactsBindingUnused: "customer_sales_order_commercial_facts_v1 bound but no quotation document type",
    point73ReferencedInBuyer: false,
  },
  prerequisite: {
    owner: "oasis-supabase-core",
    requiredBeforeBuyerWireUp: missingQuoteRpcs,
    acceptanceMustReturn: "governed handoff only — not shadow Sales Order creation in Buyer",
    p107ExplicitlyDownstream: "native order submission remains separate",
  },
};

console.log(JSON.stringify(report, null, 2));

if (shadowFindings.length) {
  console.error("P106 census failed: shadow quote authority detected.");
  process.exit(1);
}

if (missingQuoteRpcs.length) {
  console.error(
    `BLOCKED — Core prerequisite missing (${missingQuoteRpcs.length} RPCs). Buyer quotation flow remains fail-closed.`
  );
  process.exit(2);
}

if (missingExecutableRpcs.length) {
  console.error(
    `P106 census failed: ${missingExecutableRpcs.length} quotation RPC(s) are allowlisted but not invoked via callRpc in src/lib/api/quotes.ts.`
  );
  process.exit(1);
}

console.log("P106 census passed: quote RPCs are bound and no shadow authority was detected.");
