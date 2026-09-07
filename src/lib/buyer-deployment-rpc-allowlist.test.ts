import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUYER_DEPLOYMENT_RPC_ALLOWLIST } from "./buyer-deployment-rpc-allowlist";

describe("buyer deployment rpc allowlist", () => {
  it("stays in sync with verify-contract-boundary.mjs", () => {
    const boundarySource = readFileSync(join(process.cwd(), "scripts/verify-contract-boundary.mjs"), "utf8");
    for (const rpc of BUYER_DEPLOYMENT_RPC_ALLOWLIST) {
      assert.match(boundarySource, new RegExp(`"${rpc}"`));
    }
  });
});
