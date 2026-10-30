# Physical reconciliation, hybrid visual alignment and certification preparation — 31 Oct 2026

Baseline V3 `bcee58af7b9f2fc243540c1404d5f03c07d83491`. Local branch `local/carton-physical-v4`. Private review only. Nothing pushed, merged, deployed or activated; all three carton configurations remain inactive; PR #66/#67 untouched; no commercial code changed.

## 1. Physical specifications master (owner-confirmed 31 Oct 2026)
Machine-readable in `src/lib/carton-physical-spec.ts` (metadata only, not wired to prices, MOQ, eligibility or activation). Four quantities are kept separate: primary packs per carton; arrangement inside the carton; internal levels; maximum external stacking (cartons).

| Carton (config id) | L×B×H (in) | L×B×H (mm, ×25.4) | Primary pack (mm) | Packs/carton | External stack |
|---|---|---|---|---|---|
| 666×6 (`bulk-6`) | 15.5 × 10.75 × 13.75 | 393.7 × 273.05 × 349.25 | Deluxe Box 666, 265 × 190 × 115 | 6 | 4 cartons |
| 888×4 (`888x4`) | 20 × 13.75 × 13.25 | 508 × 349.25 × 336.55 | Nakoda 10 L, 340 × 260 × 160 | 4 | 4 cartons |
| RTC1×10 (`bulk-10`, mapping to be confirmed) | 13 × 8.5 × 13 | 330.2 × 215.9 × 330.2 | RTC1 tray 300 × 210 × 32 | 10 | 4 cartons |
Open attributes (not assumed): whether carton dimensions are external or internal; whether pack heights include the lid; lid nesting/overhang; wall/flap thickness; tolerance. `confirmedArrangement` and `internalLevels` are `null` for all three.

## 2. Dimensional feasibility (calculations: `FEASIBILITY_REPORT.md/.json`, tests `carton-feasibility.test.ts`)
Method: all six axis orientations, floor(space/size) per axis, carton figures taken as usable inside (best case), no invented thickness.
- **666×6 — mathematically feasible only under unverified assumptions.** The frozen visual arrangement (2 across × 1 deep × 3 levels, long axis into depth) needs 380 × 265 × 345 mm against 393.7 × 273.05 × 349.25: clearance **13.7 / 8.05 / 4.25 mm**. It is the **only** orientation that reaches six boxes. If the owner's figures are external, wall thickness per side must stay below about 6.85 / 4.0 / 2.1 mm (L/B/H), a derived bound, not a measurement. The 4.25 mm height margin (1.2 %) is the tightest; lid rim/flap interference cannot be judged from these data. Requires physical confirmation. The reference photographs agree with the orientation (lids show rows running into depth).
- **888×4 — DIMENSIONALLY INCOMPATIBLE as supplied.** The frozen 2 × 1 × 2 arrangement needs 520 mm across against 508 mm (**12 mm short** even with zero wall thickness). No axis-aligned orientation holds four boxes; the best is three (160 mm side across, 340 mm deep, 260 mm high: slack 28 / 9.25 / 76.55). Either a carton or box dimension is different from the figures given (the Nakoda screenshot dimensions are listing values and may be nominal or include flanges), or the real arrangement is not rectilinear. **The 888×4 render stays provisional and must not be presented as feasible.** No alternate orientation was implemented.
- **RTC1×10 — feasible under unverified assumptions.** One vertical stack of ten 300 × 210 × 32 mm trays: 10 × 32 = 320 mm in 330.2 mm (**10.2 mm** slack); footprint slack 30.2 mm (L) and 5.9 mm (B). The 5.9 mm breadth margin and any lid height (if 32 mm excludes the lid), nesting, or ribbing make this unproven. No nesting factor was assumed.

## 3. Visual alignment with the approved hybrid references
Hierarchy applied: physical specs > photographs of packaging > approved hybrid references > frozen V3 > earlier drafts.
Changed (cosmetic, one deterministic renderer, tray rectangles/positions/order untouched): transparent lid inset panel and rim (both Delux 666 and Nakoda lids show one), faint wall highlights on the transparent walls, illustrative pieces re-drawn 4 across × 2 rows as in the reference photographs (previously 6 across; never a product-count claim).
Preserved by rule (differences from the references, owner decisions):
1. **Logo opacity.** The references show the gold logo and black arrows fully opaque in the open state, including over packed boxes. The frozen treatment draws open-state printing as an 18 % watermark (guarded by a test, ≤ 0.2). Not changed; switching to opaque is a one-constant change that needs your approval.
2. **Arrow/label placement.** References put the arrows and "THIS SIDE UP" at the base of the face; the frozen coordinates put them near the top. Not moved.
3. **Front frame.** References show a ≈ 5–6 % white frame; V3 draws ≈ 1 %. A wider frame would overlap the packed boxes, so unchanged.
4. **Flaps.** References have taller rear and larger side flaps; frozen flap polygons unchanged.
5. **Proportion.** The frozen schematic body is much wider than the physical carton (666×6: 2.31:1 vs 1.13:1 physical front face; 888×4: 2.86:1 vs 1.51:1; tray 3.19:1 vs 1.65:1). The approved reference itself is also wide (≈ 2.2:1 by eye, with the front flap hiding part of the face). The illustration is therefore not dimensionally proportional; treat it as illustrative.
6. Isometric/top views and photographic tray ribbing are not rendered; RTC1 trays and the closed-carton tape are not drawn.
Geometry invariance against V3 (`geometry-invariance-vs-V3.json`): viewBox, flaps, body, closed top, tray rectangles and order, logo box, arrows, branding opacity, floor and frame width identical in all 14 frames.

## 4. RTC1×10 configuration preparation
Catalogue entry `bulk-10` ("Type C — 10 inner trays", capacity 10, inactive) already exists; physical metadata added (§1). Not added: geometry, frames or packing sequence (a single ten-high stack is not a two-column layout; the renderer's two-column geometry type must not be reused). Activation requirements: confirm id mapping; carton basis (external/internal); tray + lid stacked height and nesting; whether 1 kg and 2 kg trays share the 32 mm height; Operations packing-profile rows (Core projection O7); approved artwork and a front-view geometry designed from measurements; MOQ/increment from the commercial projection (unchanged); owner approval; Core activation.

## 5. Verification (fresh)
302/302 tests (296 + 6 new), tsc, eslint (max-warnings 0), boundary, decisions, rc:scan, rc:navigation pass; `npm audit --omit=dev` 52 (2 critical), identical to base; browser harness: 14 runtime states, pending-geometry gate, 5 malformed previews rejected, accessible count/range, live reduced-motion change, cleanup, nine-width viewport matrix, no external requests. Commercial boundary: no change to carton-commercial, draft-add-guard, catalogue price, Genie or cart code; all three configurations `active:false` (tested).

## 6. Certification decisions (separate)
| Area | Decision |
|---|---|
| Renderer technical correctness | PASS (local) |
| Primary packaging fidelity | Partial: lidded transparent boxes, 4-across pieces; RTC1 not rendered; exact photographs not embedded |
| Packing geometry | 666×6 UNVERIFIED (fits only if figures are internal, 4.25 mm margin); 888×4 CONFLICT (12 mm short); RTC1×10 UNVERIFIED |
| Visual appearance | Improved; owner review pending; differences §3 |
| Physical measurements | UNVERIFIED (basis, lids, walls) |
| Artwork approval | UNVERIFIED |
| Mobile responsiveness | PASS in browser harness at 9 widths; no device |
| Android / iOS UAT | NOT PERFORMED |
| Authenticated Buyer integration | NOT PERFORMED |
| Commercial authority | Core authoritative; unchanged; NOT ACTIVATED |
| Production release readiness | NOT READY (physical conflict, artwork, UAT, security dependency findings) |
No owner approval is claimed.

## 7. Owner-action register
O-A Confirm whether carton L×B×H are external or internal. O-B Resolve 888×4: re-measure the carton and one Nakoda box (with lid) or state the real arrangement. O-C Confirm 666×6 real arrangement and lid/flap clearance by a physical trial pack. O-D Confirm whether pack heights include lids; supply wall/flap thickness. O-E Confirm RTC1×10 = `bulk-10`; stacked height of ten closed trays; 1 kg vs 2 kg tray heights. O-F Decide logo/arrow opacity and placement vs the references (§3.1–3.2). O-G Approve artwork (D1/D3). O-H Supply physical closure/tape evidence (E1/E2). O-I Device UAT. O-J Core packing-profile projection, prices, MOQ (O1–O7 register). O-K Address the 52 dependency findings before release.
