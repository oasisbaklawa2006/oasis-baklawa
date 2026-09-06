import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CORE_QUOTE_RPC_PREREQUISITES, isQuoteBackendAvailable } from "@/types/quote-contract";

const ROOT = join(__dirname, "..");

function walkSource(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walkSource(path));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(path);
  }
  return files;
}

describe("P106 quotation authority invariants", () => {
  it("reports Core quote RPC prerequisites as unavailable in Buyer main", () => {
    assert.equal(isQuoteBackendAvailable(), false);
    assert.deepEqual(CORE_QUOTE_RPC_PREREQUISITES, [
      "customer_quotations_v1",
      "customer_quotation_detail_v1",
      "customer_quotation_lines_v1",
      "submit_customer_quotation_request_v1",
      "accept_customer_quotation_v1",
      "decline_customer_quotation_v1",
    ]);
  });

  it("does not ship shadow quote RPC calls in Buyer source", () => {
    const hits: string[] = [];
    for (const file of walkSource(join(ROOT, "lib"))
      .concat(walkSource(join(ROOT, "screens")), walkSource(join(ROOT, "services")))
      .filter((path) => !path.endsWith(".test.ts"))) {
      const source = readFileSync(file, "utf8");
      for (const rpc of CORE_QUOTE_RPC_PREREQUISITES) {
        if (source.includes(`"${rpc}"`)) hits.push(`${file}:${rpc}`);
      }
    }
    assert.deepEqual(hits, []);
  });

  it("registers fail-closed quotation routes without checkout masquerade", () => {
    const navSource = readFileSync(join(ROOT, "navigation/RootNavigator.tsx"), "utf8");
    assert.match(navSource, /name="Quotations"/);
    assert.match(navSource, /name="QuotationDetail"/);
    const checkoutSource = readFileSync(join(ROOT, "screens/CheckoutScreen.tsx"), "utf8");
    assert.doesNotMatch(checkoutSource, /quotation|quote/i);
    const quotationsSource = readFileSync(join(ROOT, "screens/QuotationsScreen.tsx"), "utf8");
    assert.match(quotationsSource, /isQuoteBackendAvailable/);
    assert.doesNotMatch(quotationsSource, /submit_customer_order_v1/);
  });

  it("routes account access to the quotation screen entry point", () => {
    const accountSource = readFileSync(join(ROOT, "screens/AccountScreen.tsx"), "utf8");
    assert.match(accountSource, /navigate\("Quotations"\)/);
  });
});
