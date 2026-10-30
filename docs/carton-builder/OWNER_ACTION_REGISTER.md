# Blocker dependency map and owner-action register (30 Oct 2026)

Audited head of PR #66: `94f3d397e384b2edece16fd9b3ad64d5244d0613`. PR #66 stays **draft**.

## A. Dependency on Core PR #399

Core #399 (`release/buyer-fullfeel-runtime-train-20261006`, draft, mergeable_state "blocked") is a payment-provider and account-write train: security repairs, delivery-address and saved-transporter writes, generic payment-provider session/webhook runtimes. Its file list has no packing, carton, price or GST change (verified by reading the PR's file list).

| Blocker | Depends on #399? |
|---|---|
| Packing-profile projection, packing evidence, artwork | **No** |
| Approved loose-sweet prices, GST authority, MOQ unit/increment | **No** (Finance flow) |
| Device UAT of cart/catalogue/Genie fixes | **No** |
| Non-production integration run | **No** (needs a non-production environment, either a Core preview or a separate project; its host is not decided here) |
| Payment activation, address/transporter writes in the Buyer | **Yes** (#399's migrations and edge runtimes). Not part of Task 1. |
| Universal quote authority / legacy `submit_customer_order_v1` closure | **No**, separate Core/Central work (Core #414 merged; Central callers still bind legacy) |

Caution: #399 touches `supabase/tests/20260910160000_catalogue_ai_studio_source_intake.sql`. When Core designs the packing governance tables, confirm no overlap with catalogue AI-Studio intake. Not verified.

## B. Verification status of each blocker

| Blocker | Status |
|---|---|
| 0 of 147 loose sweets with an approved B2B rule; legacy price columns populated | **Verified this session** (SELECT) |
| 10 of 12 rule GST NULL while product GST present; 2 rule/product GST conflicts | **Verified this session** |
| Packing-profile RPCs absent; no dimensions/tray data for the 147 | **Verified this session** |
| Legacy classes cannot map to configurations | **Verified this session** |
| 262/262 tests, checks, threads at `94f3d39` | **Verified this session** |
| Legacy `submit_customer_order_v1` executable by authenticated; Central still calls it | Reported (owner release-watch), **not re-probed** |
| Two security-definer views readable by authenticated | Reported, **not re-probed** |
| Core #399 preview-check failure and 2 unresolved payment threads | Reported, **not re-probed** (PR metadata shows blocked) |
| Central #632 Gate 0 Android/MSG91 physical evidence absent | Reported, **not re-probed** |
| Golden-path finance-facts skipped (no orders); P106 `originMainSha` null | Reported, **not re-probed** |

## C. Owner-action register (irreducible human or external actions only)

| # | Action | Owner | Type | Unblocks | Evidence required to close |
|---|---|---|---|---|---|
| O1 | Decide which source is authoritative for **GST** (rule vs product master) and the **unit** loose-sweet prices are expressed in (kg / pack / carton) | Finance + business owner | Financial authority, human decision | GST and price publication | Written decision referenced in the pricing flow |
| O2 | Approve and publish B2B prices (with GST) for the 147 loose sweets through the governed pricing-draft flow | Finance | Financial authority, production data | Loose sweets become orderable | Approved `product_pricing_rules` rows; re-run of the buyer-projection census |
| O3 | Decide the **ordering unit and increment** (tray vs kg) for loose sweets and approve MOQ | Business owner + Core | Business decision | Slot conversion and MOQ | Decision record; MOQ published |
| O4 | Return the **packing-master template** (147 rows) with evidence, or record per row that it is not carton-managed | Operations | Physical measurement / controlled documents | Per-SKU eligibility | Template returned, every filled row has an evidence reference |
| O5 | Confirm the **outlier SKUs** (`OAS-ORA-1000`, `OAS-OSH-6000`, `OAS-BLU-1000`, `OAS-LAT-1000`, `OAS-KIT-6000`) | Operations | Human confirmation | Template accuracy | Corrected master or note |
| O6 | Provide **approved 888×4 artwork (six states)** and 6/10 geometry and artwork | Business owner / designer | Human asset | Visual integration | Files plus signed-off geometry |
| O7 | **Assign** the Core packing-profile projection (spec) to Core in Mission Control; implement, test, merge via protected path; import approved template data | Mission Control + Core | Governed Core migration, protected approval | Carton UI can show real data | Merged migration; spec §9 tests passing; non-production run |
| O8 | Provision the **non-production environment and test personas** | Core / DevOps / QA | Credentials, environment | Integration scenarios | Environment id and persona list |
| O9 | Execute **device UAT** (Android, iOS, web, TalkBack, 320–430 dp) on a signed build | QA / staff | Physical UAT | T1.12 | Signed evidence per scenario |
| O10 | **Close the legacy submit route** (Central caller migration, then Core restriction) and finish #65 | Core + Central + Buyer | Financial authority, protected approval | Task 2 / checkout certification | Evidence per #64 matrix row 8 |
| O11 | Fix Core #399's preview check and resolve its 2 payment review threads | Core | Provider/environment | Payment activation (not Task 1) | Green governance checks |
| O12 | Gate 0 Android / MSG91 physical evidence | Staff + provider | Physical UAT, provider | Auth certification | Central #632 evidence |
| O13 | Review and remediate the two security-definer views | Core / security | Production access | Security sign-off | Least-privilege change plus tenant negative tests |
| O14 | Formal human review/approval of PR #66 after O1–O9 | Reviewer | Human approval | Merge eligibility | APPROVED review at the final head |

## D. Work needing explicit approval before it proceeds
- Opening or changing anything in Core (O7, O10, O11, O13).
- Any Buyer change that binds the new RPCs (needs O7).
- Engine extension for kg-to-tray conversion (needs O3).
- Using the isolated validator branch in PR #66 (currently kept separate).
