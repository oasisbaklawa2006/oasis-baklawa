# Oasis Genie — Phase-2 reservation (Buyer)

Date: 2026-09-22

Buyer main baseline at reservation: `fa742d9e4a9b309342044d419db91ae02e2e4e41`.

Core governed parser baseline: oasis-supabase-core `5ddba9da0f43fe37331bc58ed734c5e04ac86b68`
(Task 3 / PR #341 — `ai-order-parse`).

## Phase-1 posture (launch protection)

Genie is **OFF** for the Phase-1 production candidate.

| Control | Mechanism |
| --- | --- |
| Master gate | `EXPO_PUBLIC_GENIE_PARSE_ENABLED` → `GENIE_ENABLED` in `src/lib/genie-parse-availability.ts` |
| Absent flag | Genie OFF |
| Malformed flag | Genie OFF (only explicit `true` enables) |
| Production default | OFF (flag not set in EAS production profile) |
| Navigation | Dashboard chip and Quick Order AI link hidden while OFF |
| Deep link / stale nav | `AiOrder` route redirects to `MainTabs` while OFF — no placeholder Genie UI |
| AI invocation | `invokeGenieOrderParse()` throws before `supabase.functions.invoke("ai-order-parse")` while OFF |
| Catalogue landing | Unchanged — `MainTabs` initial route remains Dashboard; no 3-second Genie interception |

Preserved foundations (not removed): multimodal intake adapters, catalogue resolution,
clarification flow, draft-line commit, and governed Core parser source.

## Architectural boundaries reserved for Phase 2

| Boundary | Buyer location | Core / governed authority |
| --- | --- | --- |
| Feature gate | `src/lib/genie-parse-availability.ts` | — |
| Overlay / route shell | `RootNavigator` → `AiOrder` stack route (registered, gated at runtime) | — |
| Multimodal intake | `src/lib/genie-intake.ts` | — |
| Governed parse | `src/lib/genie-order-parse.ts` → `ai-order-parse` | `supabase/functions/ai-order-parse/` + `_shared/genieOrderParse.ts` |
| Catalogue resolution | `src/lib/genie-product-resolution.ts` | `published_products_v1` / catalogue RPCs |
| MOQ / commercial validation | `src/lib/buyer-commercial-validation.ts` (via resolution + draft commit) | Core commercial rules on products |
| Draft → cart → SO | `src/lib/genie-draft-line-commit.ts`, checkout guards | `submit_customer_order_v1` and governed SO RPCs |
| Session audit (future) | Reserve `GenieSessionId` at Buyer orchestration layer | Reuse existing order/draft audit patterns first; no new schema until Mission Control assigns |

## Canonical Phase-2 product contract (authority)

Genie is a fast-order conversational overlay, not a catalogue replacement.

### Entry and 3-second behaviour

After login/legal prerequisites, Genie appears as a full-screen ordering surface with
voice/microphone (dominant), camera, gallery, notes, document upload, submit/interpret,
and live parsing/conversation.

On entry, a 3-second inactivity timer starts. If the customer does not interact,
Genie slides left and the main catalogue enters from the right. Genie remains as a thin
left edge-tab/rail; the customer can pull/swipe the rail to reopen. An explicit Skip
control performs the same transition immediately. Any interaction cancels the timer.

Catalogue remains the principal discovery, assortment-expansion, and upselling surface.

### Two-way clarification (hard invariant)

Flow: customer input → parse → catalogue/order-history resolution → ambiguity detection
→ Genie clarification → customer response → updated interpretation → MOQ/carton/commercial
validation → final recap → explicit customer confirmation → SO authority.

**unresolved ambiguity > 0 ⇒ SO creation prohibited.**

Also prohibit SO creation when mandatory product, quantity, variant, MOQ/carton, or
commercial clarification remains unresolved.

Never: invent SKU/product; default quantity to 1; silently substitute; silently round MOQ;
silently alter quantity; infer uncertain commercial instructions. MOQ/carton adjustments
must be proposed and explicitly accepted.

### Live parsing / conversation UI

Preserve (1) customer/Genie conversation history and (2) current structured interpreted
order, including what was said, understood, clarified, changed, and confirmed.

### Auditability (Phase-2 implementation)

Design around a unique Genie Session ID. Audit evidence should cover original inputs,
voice transcription references, uploaded evidence, Genie responses, clarification
requests/responses, interpreted-order revisions, MOQ-approved changes, final confirmed
payload, timestamps, and resulting SO reference. Prefer existing governed structures before
new schema.

## Phase-2 implementation backlog

1. Enable `EXPO_PUBLIC_GENIE_PARSE_ENABLED=true` only after Core `ai-order-parse` runtime certification and Task-5 production gates clear.
2. Replace current `AiOrderScreen` with Phase-2 overlay shell (3-second timer, left rail, skip).
3. Wire in-app microphone capture (physical UAT item).
4. Persist Genie session/conversation state and `GenieSessionId` orchestration.
5. Extend clarification UX for voice/text two-way loop end-to-end.
6. Connect final confirmation to existing checkout/SO handoff with ambiguity guards enforced server-side.
7. Add Phase-2 E2E covering clarification, MOQ proposal/acceptance, and SO prohibition on unresolved ambiguity.

## Explicit non-goals for Phase 1

- No duplicate parser in Buyer or Core.
- No production Edge Function deployment as part of this reservation.
- No fake/disabled Genie UI in customer-facing builds.
- No database migration solely to reserve Genie session audit.
