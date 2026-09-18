#!/usr/bin/env node

const required = [
  "EXPO_PUBLIC_MSG91_WIDGET_ID",
  "EXPO_PUBLIC_MSG91_TOKEN_AUTH",
];

const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length) {
  console.error(
    [
      "Buyer OTP build configuration is incomplete.",
      `Missing: ${missing.join(", ")}`,
      "Configure these values in the EAS environment selected by the build profile before building.",
      "Values are intentionally never printed by this check.",
    ].join("\n")
  );
  process.exit(1);
}

console.log("Buyer OTP build configuration verified.");
