import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectGovernedRpcInvocations,
  missingExecutableQuoteRpcs,
  readCoreQuoteRpcPrerequisites,
} from "./quote-rpc-binding-check";
import { CORE_QUOTE_RPC_PREREQUISITES } from "@/types/quote-contract";

const ROOT = join(__dirname, "..");

describe("quote rpc binding check", () => {
  it("ignores callRpc mentions inside comments and string literals", () => {
    const source = `
      // callRpc("customer_quotations_v1")
      const hint = "callRpc('submit_customer_quotation_request_v1')";
      /* callRpc("accept_customer_quotation_v1") */
      export async function noop() {
        return null;
      }
    `;
    const invocations = collectGovernedRpcInvocations(source);
    assert.equal(invocations.size, 0);
  });

  it("accepts multiline callRpc invocations", () => {
    const source = `
      export async function submit() {
        return callRpc(
          "submit_customer_quotation_request_v1",
          { p_idempotency_key: "key", p_lines: [], p_notes: null }
        );
      }
    `;
    const invocations = collectGovernedRpcInvocations(source);
    assert.deepEqual([...invocations], ["submit_customer_quotation_request_v1"]);
  });

  it("reads the canonical prerequisite set from quote-contract source", () => {
    const quoteContractSource = readFileSync(join(ROOT, "types/quote-contract.ts"), "utf8");
    const prerequisites = readCoreQuoteRpcPrerequisites(quoteContractSource);
    assert.deepEqual(prerequisites, [...CORE_QUOTE_RPC_PREREQUISITES]);
  });

  it("requires executable callRpc for every canonical prerequisite in quotes api", () => {
    const quoteContractSource = readFileSync(join(ROOT, "types/quote-contract.ts"), "utf8");
    const quotesApiSource = readFileSync(join(ROOT, "lib/api/quotes.ts"), "utf8");
    assert.deepEqual(missingExecutableQuoteRpcs(quoteContractSource, quotesApiSource), []);
  });
});
