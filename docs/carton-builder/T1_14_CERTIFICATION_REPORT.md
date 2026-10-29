# Task 1 — Certification report (30 Oct 2026)

Repository `oasisbaklawa2006/oasis-baklawa` · branch `feat/carton-moq-builder-config-v1` · draft PR #66 · tracking #64.
Base: `main` @ `e5096cf`. Code head tested locally: `6101d98497033a9de74e15e93d375fd23fa1cf81` (this report is committed on top as docs-only; exact-final-head CI is recorded in the PR).

## Overall verdict: **BLOCKED** (not certifiable)
The software foundation is implemented and passing local gates. Task 1 cannot be certified because indispensable external evidence does not exist: no buyer-safe packing data, no approved B2B prices for any loose bulk sweet, no accessible approved artwork, no device UAT. Nothing was assumed to pass.

## Files changed (vs main)
- Engine: `src/lib/carton-builder.ts` (rewrite), `src/lib/carton-commercial.ts`, `src/lib/carton-presentation.ts`, `src/lib/carton-profile-source.ts`
- UI: `src/components/CartonVisual.tsx`, `src/screens/CartScreen.tsx`, `CatalogueScreen.tsx`, `QuickOrderScreen.tsx`, `ReorderScreen.tsx`
- Repairs: `src/lib/draft-add-guard.ts`, `src/lib/catalogue-price-state.ts`, `src/lib/genie-product-resolution.ts`
- Tests: `carton-builder`, `carton-commercial`, `draft-add-guard`, `catalogue-price-state`, `genie-product-resolution` (all wired into `npm test`)
- Docs: `docs/carton-builder/T1_02_*.md` (census addendum), this report. No Core/Supabase change. No production mutation (SELECT-only census).

## Defects found and repaired
1. **Silent quantity overwrite (T1.09):** Catalogue, Quick Order and Order Again called Core's replace-quantity upsert without reading the cart. Fixed: steppers seed from the cart, action label `Add`/`Update`, bulk adds skip existing lines. Tests: `draft-add-guard.test.ts`.
2. **Genie silently raised/rounded quantities and ignored unit mismatch (T1.11):** 7 became 10; "tray" requests were treated as kg. Fixed: quantities are accepted only if already valid; otherwise the line is returned with an exact correction. Tests updated/added.
3. **Buyer #60 misleading text (T1.08):** approved buyers without a usable price were told to sign in. Fixed with a neutral message; ordering stays closed. **Root cause (verified read-only):** 10 of 12 approved B2B price rules have `gst_rate = NULL`; Core projects them, Buyer correctly rejects them. The data fix belongs to Finance/Core.
4. **Latent prototype-key hazard** in profile lookup (e.g. product id `toString`) — own-property lookup; regression tests (merged from remote review fix `ab32e19`).

## Evidence of local execution (at `6101d98`)
`npm run typecheck` pass · `npm run lint` (max-warnings 0) pass · `npm test` 257/257 pass · `verify:boundary`, `verify:decisions`, `verify:secure-random`, `rc:scan`, `rc:navigation`, `census:p106` all pass. `npx expo config` and e2e/Playwright were not run.

## Matrix
| ID | Verdict | Evidence / gap |
|---|---|---|
| T1.01 census | PASS | Journey mapped (Catalogue → ProductDetail → Cart → Checkout) and gaps found; see defects |
| T1.02 reconciliation | BLOCKED | Live census documented; per-SKU mapping, dimensions, kg↔tray conversion absent. 124/147 SKUs are 8/24-box classes with no approved configuration; none is 10 |
| T1.03 engine | PASS | Versioned, effective-dated, unlimited capacities, fail-closed; unit tests |
| T1.04 888×4 visual | BLOCKED (artwork) | Six-state logic + accessible `CartonVisual` done; approved artwork/geometry not accessible; schematic only; not device-verified |
| T1.05 6/10 | BLOCKED (artwork) | Engine verified for 6 and 10; no geometry/artwork supplied |
| T1.06 mixed variants | PASS (engine) | Explicit mixable group sets only; no real SKU data exists to exercise |
| T1.07 commercial | PASS (precheck) | MOQ/increment/price/UOM cases tested; Core stays authoritative; no Core change |
| T1.08 catalogue | PARTIAL | #60 root cause + repair. Search/filters/favourites/images/offline were read, not exercised on device |
| T1.09 draft cart | PASS (repaired paths) | Catalogue/Quick Order/Reorder fixed; ProductDetail already correct; network-retry/concurrency not exercised end-to-end |
| T1.10 discovery | PARTIAL | Carton metadata shown only with verified data (currently none); search/recs not exercised |
| T1.11 Genie/Reorder | PASS (unit) | Cannot alter quantity; Order Again re-validates against current price |
| T1.12 frontend quality | NOT VERIFIED | No Android/iOS/web run |
| T1.13 testing | PARTIAL | Local gates pass; exact-head CI, CodeRabbit, Codacy, Snyk results recorded in the PR after they run |
| T1.14 evidence | PASS | This report; PR #66 and #64 comments |

## Remaining dependencies (owner → action)
1. **Core:** publish a buyer-safe packing-profile projection (group, slots/unit, commercial UOM, config eligibility, mixable sets); bind in `carton-profile-source.ts`.
2. **Packing master / Operations:** per-SKU assignment evidence; reconcile 8/24-box classes with the owner's three-type certification (owner decision: add configurations or reclassify); kg↔tray conversion; internal dimensions.
3. **Finance/Core:** approved B2B prices for the 147 bulk SKUs; GST rate on the 10 priced products; MOQ UOM and increment.
4. **Owner:** approved 888×4 artwork (6 states) and 6/10 geometry/artwork.
5. **QA:** Android/iOS/web device UAT.

## Before merge
Exact-head CI green, review threads resolved, #65/#61 boundaries respected (no overlap in touched files except none; checkout code untouched), items above closed. PR #66 must stay draft.

## Task 2 readiness
Commerce foundation: **ready to proceed for checkout/financial work**, because Task 1 did not touch checkout, quote or payment code and corrected cart-quantity handling. Carton-driven ordering of loose sweets is **not** ready.
