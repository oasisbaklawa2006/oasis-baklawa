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
    const accountPreferencesSource = readFileSync(join(__dirname, "../lib/api/account-preferences.ts"), "utf8");
    const finalPaymentSource = readFileSync(join(__dirname, "../lib/api/final-payment.ts"), "utf8");
    const boundarySource = readFileSync(join(process.cwd(), "scripts/verify-contract-boundary.mjs"), "utf8");
    const invokedRpcs = collectGovernedRpcInvocations(
      `${gatewaySource}\n${quotesSource}\n${paymentSource}\n${finalPaymentSource}\n${accountPreferencesSource}`
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
  it("turns unsupported Buyer service surfaces into governed live request workflows", () => {
    const panelSource = readFileSync(join(__dirname, "../components/BuyerServiceRequestPanel.tsx"), "utf8");
    assert.match(panelSource, /customerGateway\.generalQueries\(\)/);
    assert.match(panelSource, /customerGateway\.submitGeneralQuery/);
    assert.match(panelSource, /getGeneralQueryIdempotencyKey/);

    for (const file of [
      "PrivateLabelScreen.tsx",
      "PackagingDecorationScreen.tsx",
      "TransporterScreen.tsx",
      "AddressesScreen.tsx",
    ]) {
      const source = readFileSync(join(__dirname, "../screens", file), "utf8");
      assert.match(source, /BuyerServiceRequestPanel/);
      assert.doesNotMatch(source, /not available yet|not published yet/i);
    }
  });

});