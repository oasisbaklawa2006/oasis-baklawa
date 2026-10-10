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

## Runtime reconciliation — 2026-10-06

The original seal correctly did not claim a runtime deployment. That external gate has since changed:

1. Core PR #341 is historical. A fresh read-only Supabase function listing (2026-10-10) confirms `ai-order-parse` is ACTIVE, version 3, and JWT-protected in production.
2. Buyer source remains fail-closed whenever `EXPO_PUBLIC_GENIE_PARSE_ENABLED` is absent/false. Actual flag values in installed Buyer builds need separate exact-build/EAS verification; parser deployment is not customer activation authority.
3. In-app microphone recording UX and real microphone/photo/document capture evidence remain physical/mobile UAT / Phase-2 scope.
4. Any later Genie activation must preserve the original no-invented-SKU/quantity and governed clarification/commercial-authority invariants.
