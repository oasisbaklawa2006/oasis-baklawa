import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GENIE_PARSE_ENABLED } from "./genie-parse-availability";

describe("GENIE_PARSE_ENABLED — ai-order-parse governance gate", () => {
  it("is false: direct inspection of the live Supabase project " +
    "(tcxvcatsqqertcnycuop) found no deployed 'ai-order-parse' function, " +
    "and it does not exist in source in oasis-supabase-core, " +
    "Oasis-Baklawa-Central, or oasis-ai-studio. This must stay false until " +
    "a governed, sourced, certified function actually exists -- flipping " +
    "it to silence a UI complaint would let the app call a production " +
    "function that isn't there", () => {
    assert.equal(GENIE_PARSE_ENABLED, false);
  });
});
