# Final certification report — Carton Builder (31 Oct 2026, local candidate, private)

Classification: **CONDITIONAL CERTIFICATION.** Not technically, visually, physically or release certified; blockers below. No owner approval is claimed. Nothing pushed, merged, deployed or activated.

## Gates (verdicts limited to PASS / FAIL / UNVERIFIED / BLOCKED / NOT APPLICABLE)
| Gate | Verdict | Basis |
|---|---|---|
| G01 Repository and baseline reconciled | PASS | V3 `bcee58a` is an ancestor of the candidate; recovery tag `checkpoint/pre-point100-8bdd042`; tests/gates re-run, not trusted from reports |
| G02 Physical specification master consistent | PASS | `carton-physical-spec.ts` + feasibility tests; internal basis, 20.75 in, RTC owner-confirmed; evidence categories kept separate |
| G03 All 26 visual states implemented | PASS | 8 + 6 + 12 SVG/PNG/runtime frames; harness passes 26 states |
| G04 Geometry and packing sequence verified | PASS | geometry tests, journey tests, sequence report, invariance vs V3 (666×6, 888×4 identical); mathematical only, see G13 |
| G05 Premium visual defects resolved | BLOCKED | remaining defects need the approved print artwork (factory gold disc logo), side-face artwork and an owner decision on logo/arrow layout; closed view is a flat front, not the photographed 3-D box |
| G06 Factory-photo reconciliation completed | PASS | FP-01…FP-11 register + comparison sheets; findings (printed 20 in, 32/40 mm, no 666 interior photo) recorded |
| G07 Branding and artwork evidence assessed | PASS | assessment done: approved oval asset retained; factory disc differs; no artwork approval exists |
| G08 Buyer App integration verified | BLOCKED | pure-logic journey verified on isolated fixtures; authenticated Buyer journey needs a Core packing-profile projection and an authorised environment |
| G09 MOQ and commercial boundaries verified | PASS | `ASSESSMENTS.md` §1; commercial tests; no commercial file changed |
| G10 Responsive and accessibility tests passed | UNVERIFIED | automated 9-width and a11y-DOM/reduced-motion checks pass, but screen reader, keyboard, landscape, slow network and refresh were not executed |
| G11 Automated tests, lint, typecheck and build passed | PASS | see `fresh-test-results.txt`; web export exit 0 |
| G12 Security and dependency findings assessed | PASS | assessed in `ASSESSMENTS.md` §3; **68 findings remain open** (major upgrades required) |
| G13 Physical pack-and-close trials verified | UNVERIFIED | no trial; protocol prepared |
| G14 Android and iOS UAT completed | UNVERIFIED | no device, emulator or simulator available |
| G15 Owner visual approval obtained | UNVERIFIED | none given |
| G16 Release and activation readiness established | BLOCKED | G05, G08, G13–G15 unresolved; Core projection, prices, MOQ, activation not authorised |

## Per-carton summary
| Carton | States | Arrangement | Feasibility (internal) | Physical trial | Evidence |
|---|---|---|---|---|---|
| 666×6 | 8 | 2 × 1 × 3, frozen visual | feasible; tightest height 4.25 mm | not performed | FP-07 closed only; no interior photograph |
| 888×4 | 6 | 2 × 1 × 2, frozen visual | feasible; tightest length 7.05 mm at 20.75 in (printed 20 in would fail) | not performed | FP-01…FP-06 top layer only |
| RTC1×10 | 12 | owner-confirmed vertical stack of ten | feasible; tightest breadth 5.9 mm, height 10.2 mm | not performed | FP-08…FP-11, identity owner-confirmed; 40 mm separate and unverified |

## Outstanding owner-action register
1. Physical pack-and-close trials and measurements per `FACTORY_VERIFICATION_PROTOCOL.md`, including four-high stacking evidence.
2. Reconcile the 888×4 printed 20 in with the confirmed 20.75 in (measure; correct label or specification).
3. Supply approved print artwork (factory gold disc, arrows, side face) and decide logo/arrow layout and open-view opacity.
4. Decide the 40 mm RTC option and, if sold, its own capacity.
5. Provide 666×6 open/populated photographs.
6. Core: packing-profile projection (contract in `CORE_PACKING_PROFILE_CONTRACT_SPEC.md`), prices, GST, MOQ; an authorised test environment for an authenticated journey.
7. Device UAT (Android, iOS) and the missing accessibility checks (G10).
8. Plan the Expo / React Navigation major upgrade for the 68 audit findings.
9. Formal owner visual approval after 3 and 7.


---
# Closure update — software closure and integration certification run (31 Oct 2026)

Classification remains **CONDITIONAL CERTIFICATION**. 360 of 360 tests pass (346 baseline, no regressions, 14 added). No owner approval is claimed; nothing pushed, merged, deployed or activated; all configurations inactive.

| Gate | Verdict | Change and evidence |
|---|---|---|
| G01 | PASS | re-verified: baseline `ef8aeb7`, V3 ancestor, recovery tag `checkpoint/pre-closure-ef8aeb7` |
| G02 | PASS | unchanged |
| G03 | PASS | 26 states unchanged and byte-identical; three supplementary exterior views added (not packing states) |
| G04 | PASS | unchanged; physical confirmation remains G13 |
| G05 | BLOCKED | supplementary oblique exterior view now gives a three-dimensional, opaque, taped carton with side print; the logo mark and layout are still not the factory print (`artwork-approval-sheet.png`); needs print-ready artwork and owner decision |
| G06 | PASS | unchanged |
| G07 | PASS | assessment extended: the factory print's Arabic wordmark appears to differ from the authorised asset (photo perspective limits comparison) |
| G08 | BLOCKED | verified with live read-only evidence: no Core packing-profile projection exists; contract-level tests pass; no authenticated test environment (`INTEGRATION_ASSESSMENT.md`) |
| G09 | PASS | unchanged; no commercial file touched |
| G10 | UNVERIFIED | **G10a automated browser and accessibility: PASS** (see below). **G10b real assistive technology and whole-app keyboard-only use: UNVERIFIED** (not executed) |
| G11 | PASS | 360 tests, tsc, eslint, boundary, decisions, forensic scan, navigation, web export |
| G12 | PASS (assessment) | assessment complete; **remediation partial: 68 → 60**; release security clearance NOT granted (`SECURITY_ASSESSMENT.md`) |
| G13 | UNVERIFIED | protocol and action pack ready; no trial |
| G14 | UNVERIFIED | no device or simulator available |
| G15 | UNVERIFIED | no owner approval |
| G16 | BLOCKED | G05, G08, G10b, G13–G15 and security migration outstanding |

## G10a — what was automated and passed (Playwright + Chromium, react-native-web; `runtime-web.json`)
Landscape phone (667×375, 844×390), tablet landscape (1024×768) and portrait (768×1024) for all three cartons (12 checks), plus the nine portrait widths; progressbar semantics (role, label, min/max/now); polite live region announcing the new count (added in this run); rendering never steals focus; the carton adds no tab stops or keyboard trap; 90 rapid state changes with carton switching end in the correct state with no stale trays; reload and history restore identical output (component level); emulated touch tap; delayed bundle (2.5 s) loads without errors; axe-core 4.10.2 on 9 states reports **0 violations** after one defect was found and fixed (sealed note contrast 4.33:1 → 5.8:1). This is automated and emulated testing; it is not real assistive-technology or device testing.

## Defects corrected in this run
1. Sealed-state note failed WCAG AA contrast (4.33:1) — fixed.
2. State changes were not announced to assistive technology (the progressbar's descendants are presentational) — separate polite live region added.
3. nanoid and eight other transitive packages had safe patch/minor advisories — lockfile updated (68 → 60 findings).


---
# Core-integration and release-clearance update (31 Oct 2026)

Classification: **CONDITIONALLY CERTIFIED** (software candidate complete and tested in isolation; release not cleared). 370 of 370 tests pass (360 baseline plus 10 new; no regressions). Nothing pushed, merged, deployed, migrated or activated; all configurations inactive; no Core database touched.

| Gate | Verdict | Change and evidence |
|---|---|---|
| G01–G04, G06, G07, G09, G11 | PASS | re-verified; 26 SVGs unchanged; commercial boundary untouched; web export exit 0 |
| G05 | BLOCKED | unchanged: approved print artwork and owner layout decision |
| G08 | BLOCKED | Core packing projection did not exist; a reviewable Core proposal (`4eba823`) now exists and passes 37 contract assertions plus rollback in an in-memory Postgres loaded with the live function definitions; the Buyer adapter is tested; **no authenticated environment or buyer identities exist, so the live journey is not run** (`CORE_INTEGRATION.md`) |
| G10 | UNVERIFIED | automated pass unchanged; real assistive technology and whole-app keyboard use not executed |
| G12 | PASS (assessment) | the React Navigation advisory chain was shown **reachable through the app's deep links** (seconds-to-unbounded freeze) and is now **mitigated by a tested guard**; 60 advisories remain; release security clearance NOT granted |
| G13, G14, G15 | UNVERIFIED | factory trials, devices, owner approval |
| G16 | BLOCKED | Core approval/merge/migration, Operations packing data, authenticated E2E, G05, G10b, G13–G15, security migration |

## Defects and risks addressed in this run
1. **Reachable deep-link denial of service** (crafted `oasisbaklawa://order/<id>?q=%AA…`): guard added; attack strings now rejected in under 50 ms.
2. No Core contract existed: reviewable migration, rollback and contract test produced; consumer adapter built and tested.
