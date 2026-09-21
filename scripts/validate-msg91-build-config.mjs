#!/usr/bin/env node

const required = [
  "EXPO_PUBLIC_MSG91_WIDGET_ID",
  "EXPO_PUBLIC_MSG91_TOKEN_AUTH",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];

const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length) {
  console.error(
    [
      "Buyer mobile build configuration is incomplete.",
      `Missing: ${missing.join(", ")}`,
      "Configure these values in the EAS environment selected by the build profile before building.",
      "Values are intentionally never printed by this check.",
    ].join("\n")
  );
  process.exit(1);
}

// PHYS-01 (2026-09-21) proved that the Central browser widget had been
// accidentally reused by the native Buyer App. MSG91 rejects mobile OTP from
// a Web-only widget with "Mobile requests are not allowed for this widget."
// Keep the known Central browser widget(s) fail-closed here so that an Android
// or iOS Buyer build cannot silently ship with the wrong integration class.
//
// This is intentionally a public widget identifier, never a provider authkey or
// token. Add a replacement browser widget here if Central's web widget changes.
const CENTRAL_WEB_WIDGET_IDS = new Set([
  "3664766e464b383030383331",
]);

const buyerWidgetId = process.env.EXPO_PUBLIC_MSG91_WIDGET_ID?.trim() ?? "";
if (CENTRAL_WEB_WIDGET_IDS.has(buyerWidgetId)) {
  console.error(
    [
      "Buyer mobile OTP configuration is unsafe.",
      "EXPO_PUBLIC_MSG91_WIDGET_ID points to the Central WEB widget.",
      "Create/use a dedicated MSG91 widget with Mobile Integration enabled for the native Buyer App.",
      "No credential values are printed by this check.",
    ].join("\n")
  );
  process.exit(1);
}

console.log("Buyer mobile build configuration verified.");
