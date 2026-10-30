> Historical as-built report at audited head 341cb3d. Current local repair evidence supersedes its rendering/test assertions; see evidence/compliance.json, runtime-web.json and the separately delivered local certification reports. The earlier 888 handwritten-source claim is unverified and must not be treated as physical approval.

# Deterministic carton visualisation — implementation review, 30 October 2026

**Verdict: PARTIAL IMPLEMENTATION / NOT CERTIFIED.** No production release or commercial activation. Owner visual approval, measured physical fit and native UAT are outstanding. The deterministic vectors are review drafts, not equivalent to the premium photographic reference.

## D1 — Reconciliation and work lane

Repository: oasisbaklawa2006/oasis-baklawa. Parent certification issue #64. Scope: owner-directed carton visual renderer; Buyer client only. Upstream: Core governed packing projection, Operations measurements and approved artwork. Stop condition: independent review package; no merge/release or inferred backend authority. This owner directive authorizes the isolated implementation lane; no new Core ASM assignment is inferred. Mission Control remains programme authority.

Live PR census:
- #66: draft, head aabce8be35d55e6d65f736144b701c5856809a52, base main e5096cfa37049743a3c3d768948943c03b10612b. Historical 94f3d39 is superseded by documentation refresh.
- #67: draft, head 77306a0bb2d06964cde8bab5dc5b2b143c9dab91, stacked on #66. This branch starts here, preserving packing-contract work.
- #59 4a0eb70e93f6dbd769e39e98c399d2e10bead19b: Android login pre-UAT, untouched.
- #61 0f5fccb429bc995d1416b37438e36ab43d7df3f8: tax disclosure, untouched.
- #65 537a2b619eaac100b6c954ac7b62e41ac67db2f8: authoritative quote gate, untouched.

As built before changes: carton-builder.ts already supplies configuration catalogue, verified-profile eligibility, mixing rules, allocation and quantity-preserving planning. carton-commercial.ts layers commercial checks separately. carton-profile-source.ts is a fail-closed seam; it does not yet consume a published Core packing RPC. CartonVisual was neutral cells + animated progress, with accessibility helpers. #67 adds contract validation and owner dependency register. No existing geometry renderer or approved image atlas was present. Existing 4/6/10 configs remain inactive. Never rename bulk-6 to 666x6 in a commercial contract silently: bulk-6 is retained as ID; 666×6 is display text.

## D2/D5 — Frozen visual contract

carton-geometry.ts holds versioned visual geometry, explicit slots and insertion sequence, tray dimensions/orientation, front opacity, branding and individual flap polygons. Coordinates are illustrative viewBox units, **not physical millimetres**. PhysicalMeasurements is separately nullable and evidence-bearing. Both layouts remain pending. No conversion from pixels to mm is made.

carton-svg.ts is a pure serializer: geometry + occupied slot IDs + open/closed state + appearance -> SVG. It has no imports from commerce, prices, Core, or order mutation functions. It rejects invalid geometry, duplicate/unknown occupancy, unsupported stacking and partial closure. Layer order: background/walls -> trays -> ghost wall -> branding/frame -> open flaps or closure. Full-height central front overlay opacity .17 means 83% nominal transparency. This is illustrative X-ray treatment, not a manufactured transparent shipping carton.

CartonVisual uses react-native-svg 15.2.0 (Expo 51 compatible native library). Same SVG serializer is used for platform rendering and snapshots. Pending/unrecognised/invalid geometry retains existing neutral UI. This is intentional: a rendering draft must not enable ordering. No new commercial quantities or eligibility are calculated. Both supported configurations use fixed parallel front elevation and data-defined polygons. New nonuniform layouts may supply explicit slots; validation currently supports floor or directly aligned equal-width tray support. Arbitrary bridges/rotated mixed trays are not supported or certified.

Quantity changes replace tray groups atomically; there is no tray morph, camera animation or crossfade duplicate. Existing restrained meter animation remains, with live reduced-motion subscription and animation cleanup. Static SVG works without animation.

## D3/D4 — Draft state inventory

666×6 (bulk-6): 2 columns × 3 levels; frame1 empty; frame2 tray1; frame3 1,2; frame4 1,2,3; frame5 1..4; frame6 1..5; frame7 1..6; frame8 closed/full.
888×4: 2 columns × 2 levels, independently sourced from owner's handwritten top/side packing diagram and sequence in this thread, not copied from six-tray dimensions. Frames1..5 contain 0..4; frame6 closed/full. Current numerical viewBox proportions are draft illustrations, not measured physical proportions. Reinspection of factory photos and signed dimensions remains required.

No 10-tray visual is activated. Existing commercial catalogue entries are unchanged.

## D6 — Asset manifest

- assets/carton-builder/frontal-reference.jpg: supplied 50E01D0A-E641-4249-A734-3082ACBEA473(1).jpeg, Library libfile_2b80c4b0e69c81919cda10a9ce2694bd; 1448×1086 source styling reference.
- oasis-reference-oval.png: deterministic pixel crop and elliptical alpha mask from that source, not regenerated typography. Pending owner artwork approval; use official vector logo when provided.
- Reference 666 packing: supplied 511D4F49... (7), owner two-column/three-level directive. Reference 888: supplied AACD77B4... and original handwritten layout earlier in thread. AI-derived source printing is not official artwork certification.
- Trays/sweets currently lightweight shared vector shapes. **Photographic appearance fidelity fails**; do not call these photo-equivalent assets.
- Evidence manifest records SHA-256 per SVG, slot occupancy and geometry version. Reproduce: node --import tsx scripts/render-carton-evidence.ts. CairoSVG PNGs are vector-render inspection, not app/device screenshots.

## D7/D8 — Validation

Tests exercise both capacities, every frame, identical geometry serialization, no config mutation, IDs, bounds, unsupported/overlapping trays, insertion order, closure and frozen SVG hashes. Existing tests retain reduced-motion/accessibility and commerce separation coverage. Typecheck, lint, Buyer boundary, decision locks and secure random checks pass locally. Final test count recorded in execution evidence. Contact sheets and 14 individual SVG/PNG frames are under evidence/. No single pixel score is used as physical proof.

## D9 — Runtime limits

Native library compiles at TypeScript level only. Android/iOS builds, native SvgXml rendering, TalkBack/VoiceOver, physical performance and physical packing UAT are UNVERIFIED. No device or credentials fabricated. Local vector rasterisation does not certify app runtime. Web browser evidence is recorded separately if Chromium is available; not authenticated buyer golden-path evidence. No backend packing data is available in this lane, so live cart activation is deliberately dormant.

## D10 — Remaining gates

1. Operations: external/internal carton and tray L/W/H, wall thickness, lid/stacking clearance and signed evidence for both types. No measurements supplied.
2. Owner: approve both vector layouts, flap folding sequence, opacity and branding coordinates. Current closed top is schematic, not physically certified.
3. Artwork: official logo and approved reusable product/tray texture to match premium source; current sweets are stylised.
4. Core/Operations: approved per-SKU profiles, unit conversion, eligibility/mixing; projection integration belongs to existing contract work.
5. Review and CodeRabbit; branch stays draft, no protected merge bypass.
6. Native device and authenticated web UAT; performance on real target devices.

The existing OWNER_ACTION_REGISTER.md remains authoritative for Finance/GST/price and backend dependencies. None was repaired, approved or changed here.
