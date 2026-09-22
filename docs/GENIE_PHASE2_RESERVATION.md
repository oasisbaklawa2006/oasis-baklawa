# Oasis Genie — Phase 2 Reservation Contract

Status: **Phase 2 reserved; disabled for Phase 1**

## Phase 1 launch invariant

The Phase 1 Buyer App launches through its existing authenticated routing and catalogue/order experience. Genie must not intercept post-login navigation, start a timer, expose navigation, or invoke an AI/provider in Phase 1.

Existing Genie foundations are preserved; this reservation does not activate them. Any future activation must be explicit and fail closed.

## Phase 2 product contract

Genie is a fast-order conversational overlay, not a replacement for catalogue discovery.

When enabled in Phase 2:

1. After successful login and mandatory legal prerequisites, Genie may appear as the foreground ordering surface.
2. A three-second inactivity timer begins. Any meaningful Genie interaction cancels auto-collapse.
3. On three seconds of inactivity, Genie slides left and the catalogue enters from the right.
4. Skip performs the same transition immediately.
5. A thin left-edge Genie rail remains available on catalogue surfaces and can be pulled/swiped open later.
6. Input modes are Voice (primary), Camera, Gallery, Write/Notes, and Document Upload.
7. All modes feed one governed interpretation and clarification flow.

## Two-way clarification invariant

Canonical flow:

Customer input -> parse -> catalogue/order-history resolution -> ambiguity detection -> Genie clarification -> customer response -> updated interpretation -> MOQ/carton/commercial validation -> final recap -> explicit customer confirmation -> governed SO authority.

Hard rule:

`unresolved ambiguity > 0 => SO creation prohibited`

Genie must never invent a SKU/product/quantity, default quantity to 1, silently substitute, silently round MOQ/carton quantities, or infer uncertain commercial instructions. Any proposed MOQ/carton adjustment requires explicit customer acceptance.

## Live parsing and audit

The Phase 2 surface must keep synchronized:

- customer/Genie conversation history; and
- the current structured interpreted order.

A future Genie Session ID should associate original inputs, transcription/evidence references, Genie responses, clarification decisions, interpreted-order revisions, customer-approved quantity/MOQ changes, final confirmed payload, timestamps, and resulting SO reference. Reuse governed existing authority where possible; do not create shadow product, order, or commercial authority.

## Integration boundaries

Phase 2 must reuse, rather than duplicate:

- the governed Core AI/order-parse boundary;
- canonical catalogue/product resolution;
- previous-order context;
- MOQ/carton/business-rule validation;
- explicit confirmation;
- existing SO/Golden Pipeline authority.

## Activation rule

A future implementation may add an explicit feature gate. It must fail closed: absent or malformed configuration means Genie OFF. While OFF there must be no Genie interception, navigation, timer, edge rail, background parsing, or provider invocation.

This document alone changes no Buyer runtime/native/build-time configuration and therefore causes **no APK rebuild**.
