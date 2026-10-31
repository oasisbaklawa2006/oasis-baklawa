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
