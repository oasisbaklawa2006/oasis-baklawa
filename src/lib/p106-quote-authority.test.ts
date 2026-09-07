import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUYER_BOUND_QUOTE_RPCS, CORE_QUOTE_RPC_PREREQUISITES, isQuoteBackendAvailable } from "@/types/quote-contract";

const ROOT = join(__dirname, "..");

describe("P106 quotation authority invariants", () => {
  it("binds all six Core quotation RPCs in Buyer", () => {
    assert.equal(isQuoteBackendAvailable(), true);
    assert.deepEqual([...BUYER_BOUND_QUOTE_RPCS], [...CORE_QUOTE_RPC_PREREQUISITES]);
  });

  it("routes quotation RPCs through governed api and gateway", () => {
    const gatewaySource = readFileSync(join(ROOT, "services/customerGateway.ts"), "utf8");
    const quotesSource = readFileSync(join(ROOT, "lib/api/quotes.ts"), "utf8");
    assert.match(gatewaySource, /quotations:\s*\(\)/);
    assert.match(gatewaySource, /acceptQuotation/);
    for (const rpc of CORE_QUOTE_RPC_PREREQUISITES) {
      assert.match(quotesSource, new RegExp(`"${rpc}"`));
    }
  });

  it("does not masquerade quote acceptance as checkout submit", () => {
    const detailSource = readFileSync(join(ROOT, "screens/QuotationDetailScreen.tsx"), "utf8");
    const checkoutSource = readFileSync(join(ROOT, "screens/CheckoutScreen.tsx"), "utf8");
    assert.doesNotMatch(detailSource, /submit_customer_order_v1|navigate\("Checkout"\)/);
    assert.doesNotMatch(checkoutSource, /acceptQuotation|accept_customer_quotation_v1/);
  });

  it("registers governed quotation routes", () => {
    const navSource = readFileSync(join(ROOT, "navigation/RootNavigator.tsx"), "utf8");
    assert.match(navSource, /name="Quotations"/);
    assert.match(navSource, /name="QuotationDetail"/);
    const accountSource = readFileSync(join(ROOT, "screens/AccountScreen.tsx"), "utf8");
    assert.match(accountSource, /navigate\("Quotations"\)/);
  });
});
