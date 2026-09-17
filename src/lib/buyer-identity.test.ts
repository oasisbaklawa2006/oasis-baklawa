import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isEmailIdentifier, normalizeEmail, normalizePhone } from "./buyer-identity";

describe("buyer-identity normalization", () => {
  it("recognizes a plausible email and rejects a bare mobile number", () => {
    assert.equal(isEmailIdentifier("buyer@company.com"), true);
    assert.equal(isEmailIdentifier("9876543210"), false);
  });

  it("lowercases and trims email", () => {
    assert.equal(normalizeEmail("  Buyer@Company.COM  "), "buyer@company.com");
  });

  it("normalizes a 10-digit Indian mobile number to 91-prefixed and e164 forms", () => {
    const result = normalizePhone("9876543210");
    assert.equal(result.last10, "9876543210");
    assert.equal(result.e164, "+919876543210");
  });

  it("strips a leading 0 / +91 / 91 consistently to the same last10", () => {
    const variants = ["09876543210", "+919876543210", "919876543210", "98765 43210"];
    for (const v of variants) {
      assert.equal(normalizePhone(v).last10, "9876543210", `expected last10 9876543210 for input "${v}"`);
    }
  });

  it("returns empty fields for an empty/garbage input rather than throwing", () => {
    const result = normalizePhone("");
    assert.equal(result.last10, "");
    assert.equal(result.e164, "");
  });
});
