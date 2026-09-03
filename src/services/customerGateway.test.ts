import { describe, it } from "node:test";
import assert from "node:assert/strict";
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

describe("customerGateway tranche-5 bindings", () => {
  it("binds all customer-safe Core contracts through the buyer gateway", () => {
    const source = readFileSync(join(__dirname, "../services/customerGateway.ts"), "utf8");
    for (const rpc of REQUIRED_BINDINGS) {
      assert.match(source, new RegExp(`"${rpc}"`));
    }
    assert.match(source, /if \(!input\.orderId\.trim\(\)\)/);
    assert.match(source, /normalizeCustomerStatement/);
    assert.match(source, /normalizeCustomerFinanceFacts/);
  });
});
