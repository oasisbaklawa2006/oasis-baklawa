import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectGovernedRpcInvocations } from "@/lib/quote-rpc-binding-check";
import { REQUIRED_RPC_BINDINGS } from "@/lib/required-rpc-bindings";

describe("customerGateway tranche-5 and P106 bindings", () => {
  it("binds all customer-safe Core contracts through the buyer gateway", () => {
    const gatewaySource = readFileSync(join(__dirname, "../services/customerGateway.ts"), "utf8");
    const quotesSource = readFileSync(join(__dirname, "../lib/api/quotes.ts"), "utf8");
    const paymentSource = readFileSync(join(__dirname, "../lib/api/payment-gateway.ts"), "utf8");
    const finalPaymentSource = readFileSync(join(__dirname, "../lib/api/final-payment.ts"), "utf8");
    const boundarySource = readFileSync(join(process.cwd(), "scripts/verify-contract-boundary.mjs"), "utf8");
    const invokedRpcs = collectGovernedRpcInvocations(
      `${gatewaySource}\n${quotesSource}\n${paymentSource}\n${finalPaymentSource}`
    );
    for (const rpc of REQUIRED_RPC_BINDINGS) {
      assert.ok(invokedRpcs.has(rpc), `governed quote/api layer missing binding for ${rpc}`);
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
    assert.match(gatewaySource, /createPaymentIntent/);
    assert.match(gatewaySource, /paymentIntentStatus/);
  });
});
