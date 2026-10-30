# Non-production integration test plan — Task 1 commerce and carton paths

**Status: PLAN. Nothing in this plan has been executed. It needs a non-production Supabase environment and test credentials that do not exist in this repo or session.** Production is never used for mutating tests.

## 1. Environment (preconditions)

| Need | Detail | Owner |
|---|---|---|
| Non-production Supabase | A Supabase preview branch or separate project that mirrors Core's migration ledger. Never `tcxvcatsqqertcnycuop` (production) for writes. | Core / DevOps |
| Buyer personas | (a) approved buyer company A, (b) approved buyer company B, (c) pending buyer, (d) frozen buyer, (e) staff-only account, (f) anonymous. Created through the governed onboarding path, not by SQL shortcuts. | QA + Core |
| Synthetic catalogue | 8–10 **synthetic** SKUs (prefix `TEST-`), synthetic approved prices and GST, synthetic packing profiles. **No real price, GST or packing value is copied from production.** | QA |
| Build | App built from the exact PR head; commit SHA recorded in every result. | Buyer |

## 2. Execution rules
- Record: test id, SHA, environment id, persona, steps, expected, actual, evidence link, PASS/FAIL/BLOCKED.
- A skipped step is `BLOCKED`, never PASS.
- Fault injection uses network blocking or a test proxy, not code changes.
- No real payment, OTP or order submission. Quoted submission stays out of scope (Task 2).

## 3. Scenarios

### Cart quantity preservation (T1.09)
| ID | Scenario | Expected |
|---|---|---|
| C1 | Cart holds product P at 30; open Catalogue; stepper starts at 30; press "Update cart" with 35. | Cart shows 35; notice states was 30, now 35. |
| C2 | Same, press with 30. | No change; notice says already in cart. |
| C3 | Quick Order tap on P (in cart at 30). | Cart stays 30; notice says already in cart. |
| C4 | Order Again with 3 products, one already in cart at a different quantity. | Two added; the existing line unchanged; no overwrite. |
| C5 | Block the draft read (offline for that call), open Catalogue, press add. | Add disabled / refused with a message; cart unchanged. |
| C6 | Edit P in Cart to 40, switch to Catalogue tab. | Stepper and label show 40 without reload spinner. |
| C7 | Two devices, same buyer: device 1 sets 30, device 2 presses add at stale 10. | Device 2 refreshes on focus and shows 30; no silent overwrite on a refreshed screen. Record the residual race when two devices write within milliseconds. |
| C8 | Double-tap add. | One request in flight; final quantity equals the shown value. |

### Pricing states (#60)
| ID | Scenario | Expected |
|---|---|---|
| P1 | Approved buyer, product with approved price and GST. | Price shown, add enabled. |
| P2 | Approved buyer, approved price but NULL rule GST. | "Buyer pricing unavailable for this product"; no sign-in prompt; add disabled. |
| P3 | Visitor (unapproved). | "Sign in as an approved buyer for pricing". |

### Genie / Order Again (T1.11)
| ID | Scenario | Expected |
|---|---|---|
| G1 | "7 kg X" where MOQ 10. | Line unresolved with exact correction; quantity remains 7. |
| G2 | "10 tray X" where price UOM is kg. | Unresolved with unit explanation. |
| G3 | Valid quantity. | Resolves unchanged; customer confirms before cart write. |
| G4 | Order Again where price expired. | Item flagged not orderable; not added. |

### Packing profile consumption (after Core publishes the RPCs; stubbed until then)
| ID | Scenario | Expected |
|---|---|---|
| K1 | Valid configs and profiles. | Carton UI appears in Cart; checkout gating unchanged (Core readiness only). |
| K2 | Unknown `contract_version`. | No carton UI; no error shown to the buyer. |
| K3 | Mis-keyed profile, duplicate profile, `fixed_ratio` row, non-integer slots. | Those rows rejected; others unaffected. |
| K4 | Mixed SKUs, groups mixable vs not. | Mixed in one carton only where an explicit set allows. |
| K5 | Line quantity 10 split over 4/4/2 slots, MOQ 6. | Commercial check uses 10 for every carton. |
| K6 | Profile UOM differs from price UOM. | SKU rejected; no carton fill claimed. |
| K7 | Complete carton with sub-MOQ quantity. | Illustration "complete"; commercial pre-check blocked; Core readiness decides. |

### Security / RLS (Core projections; run by Core)
Spec §9 tests 1–10, plus: persona (e) staff-only and (f) anonymous receive nothing; (d) frozen buyer receives nothing; no dimension/weight/approver column readable.

### Accessibility and performance (device)
| ID | Scenario | Expected |
|---|---|---|
| A1 | TalkBack on carton card. | Announces label, "n of N", remaining; progressbar semantics. |
| A2 | OS "Remove animations" on. | No animation; state changes immediately. |
| A3 | 320, 360, 430 dp widths; long product names; 3-digit quantities. | No clipping; touch targets ≥ 48 dp. |
| A4 | Mid-range Android, cart with 50 lines. | Interaction ≤ 100 ms; no dropped frames in the 180 ms progress animation. |
| A5 | Offline mid-session. | Existing offline banner; carton UI read-only; no stale false success. |

## 4. Exit criteria
All scenarios PASS or have a documented, owner-accepted BLOCKED; zero P0/P1 defects; every result tied to the exact SHA.

## 5. What can run today without credentials
Everything except the scenarios above is already covered by unit tests: the carton engine, commercial pre-check, draft-add guard, Genie resolution, pricing-state, packing-profile validator and accessibility model (262 tests plus the preparation branch's additions).
