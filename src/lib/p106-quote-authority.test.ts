import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUYER_BOUND_QUOTE_RPCS, CORE_QUOTE_RPC_PREREQUISITES, isQuoteBackendAvailable } from "@/types/quote-contract";
import { missingExecutableQuoteRpcs, readCoreQuoteRpcPrerequisites, resolveCheckoutDirectSubmitRpc } from "@/lib/quote-rpc-binding-check";

const ROOT = join(__dirname, "..");
const QUOTE_CONTRACT_PATH = join(ROOT, "types/quote-contract.ts");
const QUOTES_API_PATH = join(ROOT, "lib/api/quotes.ts");

describe("P106 quotation authority invariants", () => {
  it("binds all six Core quotation RPCs in Buyer", () => {
    assert.equal(isQuoteBackendAvailable(), true);
    assert.deepEqual([...BUYER_BOUND_QUOTE_RPCS], [...CORE_QUOTE_RPC_PREREQUISITES]);
  });

  it("routes quotation RPCs through governed api and gateway", () => {
    const gatewaySource = readFileSync(join(ROOT, "services/customerGateway.ts"), "utf8");
    const quoteContractSource = readFileSync(QUOTE_CONTRACT_PATH, "utf8");
    const quotesSource = readFileSync(QUOTES_API_PATH, "utf8");
    assert.match(gatewaySource, /quotations:\s*\(\)/);
    assert.match(gatewaySource, /acceptQuotation/);
    assert.deepEqual(missingExecutableQuoteRpcs(quoteContractSource, quotesSource), []);
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

  it("keeps rpc wrapper tests on the quality path", () => {
    const packageJson = JSON.parse(readFileSync(join(ROOT, "..", "package.json"), "utf8")) as {
      scripts: { test: string };
    };
    assert.match(packageJson.scripts.test, /src\/lib\/rpc\.test\.ts/);
  });

  it("clears quotation request idempotency after every acknowledged submission", () => {
    const source = readFileSync(join(ROOT, "screens/ProductDetailScreen.tsx"), "utf8");
    assert.doesNotMatch(source, /if\s*\(\s*!result\.already_applied\s*\)/);
    assert.match(source, /await clearQuoteRequestIdempotencyKey\(\)/);
  });

  it("treats origin/main as optional in the P106 census", () => {
    const censusSource = readFileSync(join(ROOT, "..", "scripts/p106-quote-authority-census.ts"), "utf8");
    assert.match(censusSource, /git rev-parse origin\/main/);
    assert.match(censusSource, /onBuyerMain:\s*boolean\s*\|\s*null\s*=\s*null/);
    assert.match(censusSource, /missingExecutableRpcs/);
  });

  it("keeps census synchronized with the canonical prerequisite set", () => {
    const quoteContractSource = readFileSync(QUOTE_CONTRACT_PATH, "utf8");
    const censusSource = readFileSync(join(ROOT, "..", "scripts/p106-quote-authority-census.ts"), "utf8");
    assert.deepEqual(readCoreQuoteRpcPrerequisites(quoteContractSource), [...CORE_QUOTE_RPC_PREREQUISITES]);
    assert.match(censusSource, /CORE_QUOTE_RPC_PREREQUISITES/);
    assert.match(censusSource, /prerequisiteMismatch/);
    assert.doesNotMatch(censusSource, /const\s+CORE_QUOTE_RPC_PREREQUISITES\s*=/);
    assert.doesNotMatch(censusSource, /hasCallRpcInvocation/);
    assert.doesNotMatch(censusSource, /p106-quote-authority-census\.mjs/);
  });

  it("runs the P106 census on the enforced quality path", () => {
    const packageJson = JSON.parse(readFileSync(join(ROOT, "..", "package.json"), "utf8")) as {
      scripts: { quality: string; "census:p106": string };
    };
    assert.match(packageJson.scripts.quality, /census:p106/);
    assert.match(packageJson.scripts["census:p106"], /p106-quote-authority-census\.ts/);
  });

  const quoted = "submitQuotedCustomerOrder";
  const legacy = "submitCustomerOrder";
  const quotedRpc = "submit_customer_order_quoted_v1";
  const legacyRpc = "submit_customer_order_v1";
  const screenFor = (name: string) =>
    `import { ${name} } from "@/lib/api/checkout"; export async function submit() { await ${name}("key"); }`;
  const apiFor = (name: string, rpc: string) =>
    `export async function ${name}() { return callRpc("${rpc}", {}); }`;

  const routeCases: { label: string; screen: string; api: string; expected: string | null }[] = [
    { label: "quoted wrapper binds quoted RPC", screen: screenFor(quoted), api: apiFor(quoted, quotedRpc), expected: quotedRpc },
    { label: "legacy wrapper binds legacy RPC", screen: screenFor(legacy), api: apiFor(legacy, legacyRpc), expected: legacyRpc },
    { label: "both submit wrappers fail closed", screen: `import { ${quoted}, ${legacy} } from "@/lib/api/checkout"; await ${quoted}(); await ${legacy}();`,
      api: apiFor(quoted, quotedRpc) + apiFor(legacy, legacyRpc), expected: null },
    { label: "no submit wrapper fails closed", screen: "export const unrelated = true;", api: apiFor(quoted, quotedRpc), expected: null },
    { label: "decoy quoted RPC elsewhere cannot mask wrong wrapper", screen: screenFor(quoted),
      api: apiFor(quoted, legacyRpc) + apiFor("unrelated", quotedRpc), expected: null },
    { label: "missing governed import fails closed", screen: `await ${quoted}();`, api: apiFor(quoted, quotedRpc), expected: null },
    { label: "direct screen legacy RPC fails closed", screen: screenFor(quoted) + `\ncallRpc("${legacyRpc}", {});`,
      api: apiFor(quoted, quotedRpc), expected: null },
    { label: "comments do not count as legacy calls", screen: screenFor(quoted) + `\n// await ${legacy}();`,
      api: apiFor(quoted, quotedRpc), expected: quotedRpc },
  ];
  for (const routeCase of routeCases) {
    it(`resolves checkout submit route: ${routeCase.label}`, () => {
      assert.equal(resolveCheckoutDirectSubmitRpc(routeCase.screen, routeCase.api), routeCase.expected);
    });
  }

  it("resolves the actual checkout screen to its quoted RPC", () => {
    const screen = readFileSync(join(ROOT, "screens/CheckoutScreen.tsx"), "utf8");
    const api = readFileSync(join(ROOT, "lib/api/checkout.ts"), "utf8");
    assert.equal(resolveCheckoutDirectSubmitRpc(screen, api), "submit_customer_order_quoted_v1");
  });

});
