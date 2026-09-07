import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_BINDINGS = [
  "published_products_v1",
  "buyer_product_prices_v1",
  "customer_sales_order_commercial_facts_v1",
  "customer_order_finance_facts_v1",
  "customer_proforma_invoice_facts_v1",
  "customer_documents_v1",
  "customer_statement_v1",
  "customer_product_favourites_v1",
  "set_customer_product_favourite_v1",
  "customer_general_queries_v1",
  "submit_customer_general_query_v1",
  "customer_quotations_v1",
  "customer_quotation_detail_v1",
  "customer_quotation_lines_v1",
  "submit_customer_quotation_request_v1",
  "accept_customer_quotation_v1",
  "decline_customer_quotation_v1",
];

describe("customerGateway tranche-5 and P106 bindings", () => {
  it("binds all customer-safe Core contracts through the buyer gateway", () => {
    const gatewaySource = readFileSync(join(__dirname, "../services/customerGateway.ts"), "utf8");
    const quotesSource = readFileSync(join(__dirname, "../lib/api/quotes.ts"), "utf8");
    const boundarySource = readFileSync(join(process.cwd(), "scripts/verify-contract-boundary.mjs"), "utf8");
    const rpcSources = `${gatewaySource}\n${quotesSource}`;
    for (const rpc of REQUIRED_BINDINGS) {
      assert.ok(rpcSources.includes(`"${rpc}"`), `governed quote/api layer missing binding for ${rpc}`);
      assert.ok(boundarySource.includes(`"${rpc}"`), `verify-contract-boundary missing allowlist entry for ${rpc}`);
    }
    assert.match(gatewaySource, /if \(!input\.orderId\.trim\(\)\)/);
    assert.match(gatewaySource, /normalizeCustomerStatement/);
    assert.match(gatewaySource, /normalizeCustomerFinanceFacts/);
    assert.match(gatewaySource, /normalizePublishedProducts/);
    assert.match(gatewaySource, /normalizeBuyerProductPrices/);
    assert.match(gatewaySource, /acceptQuotation/);
    assert.match(gatewaySource, /declineQuotation/);
    assert.match(gatewaySource, /submitQuotationRequest/);
  });
});
