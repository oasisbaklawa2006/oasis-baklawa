# Physical reconciliation, hybrid visual alignment and certification preparation — 31 Oct 2026

Baseline V3 `bcee58af7b9f2fc243540c1404d5f03c07d83491`. Local branch `local/carton-physical-v4`. Private review only. Nothing pushed, merged, deployed or activated; all three carton configurations remain inactive; PR #66/#67 untouched; no commercial code changed.

## 00. Owner confirmation of RTC1×10 (31 Oct 2026, V5)
Photographs FP-08…FP-11 show the actual 1 kg sweet tray and its shipping carton: that carton is **RTC1×10** (`bulk-10`). Confirmed: internal 13 × 8.5 × 13 in; tray 300 × 210 × 32 mm; ten per carton as **one vertical stack**; external stacking limit four closed cartons. Recorded as `photographicIdentity: confirmed-by-owner`, `confirmedArrangement 1 × 1 × 10`, `internalLevels: 10` (distinct from the external stack of 4), `arrangementBasis: owner-specified`. **Pack-and-close trial: not performed** (`packTrial: not-performed`). The 40 mm tray option on the label stays separate: `alternateHeights [{40 mm, capacityStatus: unverified}]`; the height-only arithmetic (8) is not a capacity claim.

## 0. Correction of 31 Oct 2026 (supersedes the earlier §1, §2 and §4 findings)
Owner confirmed: (1) all carton dimensions are **internal usable**, Length × Breadth × Height; (2) the 888×4 length is **20.75 in**, not 20 in. The earlier "888×4 does not fit" finding was caused by the 20 in figure and is withdrawn. No renderer, geometry, packing order, commercial or artwork change was made for this correction.

## 1. Physical specifications master (owner-confirmed)
Machine-readable in `src/lib/carton-physical-spec.ts` (metadata only, not wired to prices, MOQ, eligibility or activation). Four quantities are kept separate: primary packs per carton; arrangement inside the carton; internal levels; maximum external stacking (cartons).

| Carton (config id) | Internal L×B×H (in) | Internal L×B×H (mm, ×25.4) | Primary pack (mm) | Packs/carton | External stack |
|---|---|---|---|---|---|
| 666×6 (`bulk-6`) | 15.5 × 10.75 × 13.75 | 393.7 × 273.05 × 349.25 | Deluxe Box 666, 265 × 190 × 115 | 6 | 4 cartons |
| 888×4 (`888x4`) | **20.75** × 13.75 × 13.25 | **527.05** × 349.25 × 336.55 | Nakoda 10 L, 340 × 260 × 160 | 4 | 4 cartons |
| RTC1×10 (`bulk-10`, mapping to be confirmed) | 13 × 8.5 × 13 | 330.2 × 215.9 × 330.2 | RTC1 tray 300 × 210 × 32 | 10 | 4 cartons |
`dimensionBasis` is now `internal` for all three. `confirmedArrangement` and `internalLevels` remain `null` (the owner confirmed dimensions, not the real packing arrangement).

## 2. Dimensional feasibility (all six orientations; `FEASIBILITY_REPORT.md/.json`, `carton-feasibility.test.ts`)
Method: floor(space ÷ size) per axis for each orientation; no wall, tolerance, lid interference or nesting invented. Verdict class: **mathematically feasible** (fits on confirmed internal dimensions; residual physical checks listed).
| Carton | Verdict | Arrangement that reaches the count | Clearance L / B / H (mm) | Tightest |
|---|---|---|---|---|
| 666×6 | Mathematically feasible | Only one orientation reaches 6: 2 across × 1 deep × 3 levels (190 across, 265 into depth, 115 high) = frozen visual | 13.7 / 8.05 / 4.25 | Height 4.25 mm (1.22 %) |
| 888×4 | Mathematically feasible | Only one orientation reaches 4: 2 across × 1 deep × 2 levels (260 across, 340 into depth, 160 high) = frozen visual; needs 520 × 340 × 320 of 527.05 × 349.25 × 336.55 | 7.05 / 9.25 / 16.55 | Length 7.05 mm (1.34 %) |
| RTC1×10 (identity and arrangement CONFIRMED by owner) | Mathematically feasible | 1 × 1 × 10 (300 × 210, ten 32 mm high) = 320 mm of 330.2; footprint 300 × 210 of 330.2 × 215.9 | 30.2 / 5.9 / 10.2 | Breadth 5.9 mm (2.7 %) |
Notes: 888×4 other orientations hold at most three boxes (three on edge) or two; the 160 × 260 × 340 mm orientation misses the height by only 3.45 mm and is not feasible. 666×6 alternatives hold at most four. The frozen visual arrangements are therefore physically consistent with the confirmed dimensions for 666×6 and 888×4. The earlier "wall thickness if external" bound is retired.

## 4. RTC1×10 configuration preparation
Catalogue entry `bulk-10` ("Type C — 10 inner trays", capacity 10, inactive) is now **owner-confirmed as RTC1×10**; physical metadata in §1. The owner-specified arrangement (one vertical stack of ten 300 × 210 mm trays) fits mathematically (320 of 330.2 mm). Not added: geometry, frames or packing sequence (a vertical stack is not the two-column layout; the renderer's two-column geometry type must not be reused). Activation requirements: pack-and-close trial of ten **closed** tray+lid units, measuring stacked height and any nesting (if the 32 mm excludes the lid, ten units exceed 330.2 mm unless lids nest); a separate decision on the 40 mm option and its capacity; whether the 2 kg tray (if used) shares 32 mm; Operations packing-profile rows via Core (O7); approved artwork and a front-view geometry designed from measurements; MOQ/increment from the commercial projection (unchanged); owner approval; Core activation.

## 3. Visual alignment with the approved hybrid references
Hierarchy applied: physical specs > photographs of packaging > approved hybrid references > frozen V3 > earlier drafts.
Changed (cosmetic, one deterministic renderer, tray rectangles/positions/order untouched): transparent lid inset panel and rim (both Delux 666 and Nakoda lids show one), faint wall highlights on the transparent walls, illustrative pieces re-drawn 4 across × 2 rows as in the reference photographs (previously 6 across; never a product-count claim).
Preserved by rule (differences from the references, owner decisions):
1. **Logo opacity.** The references show the gold logo and black arrows fully opaque in the open state, including over packed boxes. The frozen treatment draws open-state printing as an 18 % watermark (guarded by a test, ≤ 0.2). Not changed; switching to opaque is a one-constant change that needs your approval.
2. **Arrow/label placement.** References put the arrows and "THIS SIDE UP" at the base of the face; the frozen coordinates put them near the top. Not moved.
3. **Front frame.** References show a ≈ 5–6 % white frame; V3 draws ≈ 1 %. A wider frame would overlap the packed boxes, so unchanged.
4. **Flaps.** References have taller rear and larger side flaps; frozen flap polygons unchanged.
5. **Proportion.** The frozen schematic body is much wider than the physical carton (666×6: 2.31:1 vs 1.13:1 physical front face; 888×4: 2.86:1 vs 1.57:1; tray 3.19:1 vs 1.65:1). The approved reference itself is also wide (≈ 2.2:1 by eye, with the front flap hiding part of the face). The illustration is therefore not dimensionally proportional; treat it as illustrative.
6. Isometric/top views and photographic tray ribbing are not rendered; RTC1 trays and the closed-carton tape are not drawn.
Geometry invariance against V3 (`geometry-invariance-vs-V3.json`): viewBox, flaps, body, closed top, tray rectangles and order, logo box, arrows, branding opacity, floor and frame width identical in all 14 frames.

## 4. RTC1×10 configuration preparation
Catalogue entry `bulk-10` ("Type C — 10 inner trays", capacity 10, inactive) already exists; physical metadata added (§1). Not added: geometry, frames or packing sequence (a single ten-high stack is not a two-column layout; the renderer's two-column geometry type must not be reused). Activation requirements: confirm id mapping; carton basis (external/internal); tray + lid stacked height and nesting; whether 1 kg and 2 kg trays share the 32 mm height; Operations packing-profile rows (Core projection O7); approved artwork and a front-view geometry designed from measurements; MOQ/increment from the commercial projection (unchanged); owner approval; Core activation.

## 5. Verification (fresh)
303/303 tests (296 + 7 new), tsc, eslint (max-warnings 0), boundary, decisions, rc:scan, rc:navigation pass; `npm audit --omit=dev` 52 (2 critical), identical to base; browser harness: 14 runtime states, pending-geometry gate, 5 malformed previews rejected, accessible count/range, live reduced-motion change, cleanup, nine-width viewport matrix, no external requests. Commercial boundary: no change to carton-commercial, draft-add-guard, catalogue price, Genie or cart code; all three configurations `active:false` (tested).

## 6. Certification decisions (separate)
| Area | Decision |
|---|---|
| Renderer technical correctness | PASS (local) |
| Primary packaging fidelity | Partial: lidded transparent boxes, 4-across pieces; RTC1 not rendered; exact photographs not embedded |
| Packing geometry (math) | 666×6 PASS (mathematical, 4.25 mm min); 888×4 PASS (mathematical, 7.05 mm min); RTC1×10 PASS (mathematical, 5.9 mm min) |
| Photographic identity | RTC1×10 CONFIRMED by owner (FP-08…FP-11); 666×6 and 888×4 identities from labels only |
| Arrangement specification | RTC1×10 ten-tray vertical stack CONFIRMED (owner-specified); 666×6 and 888×4 frozen visual provisional |
| Packing geometry (physical) | UNVERIFIED for all three: pack-and-close trial NOT performed; lids, flaps and tolerance not measured |
| Visual appearance | Improved; owner review pending; differences §3 |
| Physical measurements | Carton basis CONFIRMED internal; primary-pack dimensions are reference-listing values, lid inclusion unconfirmed |
| Artwork approval | UNVERIFIED |
| Mobile responsiveness | PASS in browser harness at 9 widths; no device |
| Android / iOS UAT | NOT PERFORMED |
| Authenticated Buyer integration | NOT PERFORMED |
| Commercial authority | Core authoritative; unchanged; NOT ACTIVATED |
| Production release readiness | NOT READY (physical trial, artwork, UAT, dependency findings) |
No owner approval is claimed.

## 7. Remaining physical-certification gaps (owner-action register)
P1 Trial-pack six 666 boxes and four 888 boxes in real cartons with flaps closed; record fit, lid/flap interference and bulge (the margins are 4.25 mm and 7.05 mm). P2 Confirm each primary pack's quoted height includes or excludes the lid, and measure the real boxes (listing values are approximate). P3 RTC1×10: trial-pack and close ten tray+lid units; record stacked height and any nesting; decide the 40 mm option and its capacity separately. P4 Confirm the real packing arrangement of 666×6 and 888×4 (set `confirmedArrangement`). P5 Physical closure/tape evidence (E1/E2). Non-physical, unchanged: logo/arrow decisions (§3.1–3.2), artwork approval, device UAT, Core projection/prices/MOQ (O1–O7), 52 dependency findings.
