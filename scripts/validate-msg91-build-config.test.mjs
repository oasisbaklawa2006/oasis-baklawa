import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./validate-msg91-build-config.mjs", import.meta.url));

function run(overrides = {}) {
  const env = {
    ...process.env,
    EXPO_PUBLIC_MSG91_WIDGET_ID: "mobile-widget-for-test",
    EXPO_PUBLIC_MSG91_TOKEN_AUTH: "token-for-test",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon-key-for-test",
    ...overrides,
  };
  return spawnSync(process.execPath, [scriptPath], {
    env,
    encoding: "utf8",
  });
}

test("accepts a complete Buyer mobile build configuration", () => {
  const result = run();
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Buyer mobile build configuration verified/);
});

test("fails closed when the Supabase anon key is missing", () => {
  const result = run({ EXPO_PUBLIC_SUPABASE_ANON_KEY: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EXPO_PUBLIC_SUPABASE_ANON_KEY/);
});

test("fails closed when the Central web MSG91 widget is reused", () => {
  const result = run({ EXPO_PUBLIC_MSG91_WIDGET_ID: "3664766e464b383030383331" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Central WEB widget/);
  assert.doesNotMatch(result.stderr, /token-for-test|anon-key-for-test/);
});
