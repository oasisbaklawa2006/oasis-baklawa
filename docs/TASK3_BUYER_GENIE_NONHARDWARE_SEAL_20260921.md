# Task 3 — Buyer / Oasis Genie non-hardware software seal

Date: 2026-09-21

Buyer main baseline: `6a4337700474a1a85b1af0a2eb38563cd96d4c2c`.

## Software state

The authenticated Buyer revenue journey and payment-gateway binding are already
covered by the scheduled Buyer Mobile Golden Path Certification on main.

This change closes the remaining source-level Oasis Genie intake gap without
pretending that an undeployed Edge Function is live:

- text, voice-recording file, photo/PO and document intake all route through the
  same governed `invokeGenieOrderParse()` chokepoint;
- runtime calls are enabled only when
  `EXPO_PUBLIC_GENIE_PARSE_ENABLED=true`;
- the default is fail-closed;
- no SKU/product/quantity is invented locally;
- catalogue resolution and clarification remain downstream authority;
- payment gateway remains Core-authoritative and unchanged.

## External / runtime gates intentionally not claimed

1. Core PR #341 must merge and the `ai-order-parse` Edge Function must be
   deployed under the production-change safety gate.
2. Provider model configuration must exist in the target runtime.
3. In-app microphone recording UX and real microphone/photo/document capture
   evidence remain physical/mobile UAT.
4. Task 5 `T5-WA-001` remains the canonical P1 release blocker; this source
   change does not bypass it.
