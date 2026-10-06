import assert from "node:assert/strict";
import test from "node:test";
import { decideSocialBuyerGate } from "@/lib/social-buyer-auth-core";

test("social Buyer gate allows only authoritative approved state", () => {
  assert.deepEqual(
    decideSocialBuyerGate({ state: "approved", allowOtp: true, message: "" }),
    { type: "allow" }
  );
  assert.equal(
    decideSocialBuyerGate({ state: "approved", allowOtp: false, message: "contradiction" }).type,
    "block"
  );
});

test("social Buyer gate routes non-approved lifecycle states fail closed", () => {
  assert.equal(
    decideSocialBuyerGate({ state: "pending", allowOtp: false, message: "review" }).type,
    "navigate"
  );
  assert.deepEqual(
    decideSocialBuyerGate({ state: "rejected", allowOtp: false, message: "rejected" }),
    { type: "navigate", screen: "AccessRejected", message: "rejected" }
  );
  assert.equal(
    decideSocialBuyerGate({ state: "unknown", allowOtp: false, message: "unknown" }).type,
    "navigate"
  );
  assert.equal(
    decideSocialBuyerGate({ state: "employee", allowOtp: false, message: "staff" }).type,
    "block"
  );
  assert.equal(
    decideSocialBuyerGate({ state: "ambiguous", allowOtp: false, message: "retry" }).type,
    "block"
  );
});
