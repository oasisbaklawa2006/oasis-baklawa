import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUYER_DEPLOYMENT_RPC_ALLOWLIST } from "./buyer-deployment-rpc-allowlist";

describe("buyer deployment rpc allowlist", () => {
  it("allows only the fingerprint-bound quotation checkout route", () => {
    const allowlist = new Set(BUYER_DEPLOYMENT_RPC_ALLOWLIST as readonly string[]);
    const boundarySource = readFileSync(join(process.cwd(), "scripts/verify-contract-boundary.mjs"), "utf8");

    assert.equal(allowlist.has("customer_checkout_quote_v1"), true);
    assert.equal(allowlist.has("submit_customer_order_quoted_v1"), true);
    assert.equal(allowlist.has("submit_customer_order_v1"), false);
    assert.match(boundarySource, /"customer_checkout_quote_v1"/);
    assert.match(boundarySource, /"submit_customer_order_quoted_v1"/);
    assert.doesNotMatch(boundarySource, /^\s*"submit_customer_order_v1"\s*,/m);
  });

  it("stays in sync with verify-contract-boundary.mjs", () => {
    const boundarySource = readFileSync(join(process.cwd(), "scripts/verify-contract-boundary.mjs"), "utf8");
    for (const rpc of BUYER_DEPLOYMENT_RPC_ALLOWLIST) {
      assert.ok(boundarySource.includes(`"${rpc}"`));
    }
  });
});
