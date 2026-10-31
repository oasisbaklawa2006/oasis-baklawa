# Core × Buyer carton integration — final implementation, migration certification, release preparation

Classification: **CONDITIONALLY CERTIFIED — integration-ready, awaiting protected release approval.**
Not "fully certified": authenticated live E2E, Android/iOS UAT, factory trials, owner artwork sign-off and release security clearance are open external items (register below).

## Refs
| Item | Value |
|---|---|
| Buyer final | branch `local/carton-core-wiring`; code last changed at `e7206d37285557efa0527b9a7156325348e360d7` (parent `448bad9`); docs-only commit(s) follow — final branch HEAD SHA is in the delivery message and `SHA256SUMS`/bundle |
| Core final | branch `local/carton-packing-profile-v1` @ `875545081840c25d9c61114b3068f5d0d7bea7da` (from Core main `20708e7`; proposal `4eba8238` → fixes `ce189a75` → import pkg `8755450`) |
| Remote heads observed | Core main `20708e7`, Core #399 head `143b627e` (latest migration 20261029030000), Buyer main `e5096cfa` — unchanged |
| Migration | `supabase/migrations/20261101090000_buyer_carton_packing_profile_projection_v1.sql` (> #399 latest, base-monotonicity PASS) |
| Rollback | `supabase/rollback/20261101090000_buyer_carton_packing_profile_projection_v1_down.sql` |

Nothing pushed, merged, deployed, migrated in production or activated. Core #399 untouched; no parallel authority.

## Defects found in my own Core proposal and repaired (ce189a7)
1. Retired rows could be edited/re-approved → explicit state machine trigger (retired frozen, approved immutable, approved only → retired).
2. `carton_config_ids` had no referential integrity → trigger requires existing approved/retired configs for approved profiles.
3. `service_role` held default DELETE/TRUNCATE-class privileges → revoke all, grant select/insert/update only.
4. Added coverage: profile referencing only retired configs.

## Real PostgreSQL certification (not the in-memory harness)
- All 458 Core migrations replayed on disposable PostgreSQL 16.15 with a Supabase shim. 8 files errored (need pg_cron/vault/net). Tables: 361 = live, md5 identical. Six canonical authority functions: definition md5 identical to live. Functions 692 vs live 697 (5 missing from the errored scheduler files).
- Dry-run (apply in rolled-back txn): fingerprint unchanged. Apply: +2 tables, +5 functions. Rollback: fingerprints identical to pre-migration. Replay after rollback OK.
- **Real pgTAP: 57/57 ok** (`core-evidence/pgtap-real-results.txt`): access control, tenant isolation, versioning/fallback/retirement, half-open windows, constraints, state machine, config-ref integrity, ACL/RLS/search_path/STABLE catalog checks, duplicates.
- Mutation testing: 5 deliberate defects (no FORCE RLS, authenticated SELECT grant, no state machine, anon execute, unit filter dropped) each caught by pgTAP.
- Concurrency (`concurrency-evidence.txt`): duplicate-key race, approve-vs-edit serialisation, immutability after commit, snapshot-consistent reader.
- Core governance: `check-migration-governance.sh` PASS, `check-migration-base-monotonicity.sh` PASS; `check-migration-history-sequence.sh` **BLOCKED** — needs a production activation ref supplied by the release approver.
- Limitation: shim ≠ Supabase; RLS/JWT claims simulated via `set role` + claims GUC; no PostgREST/GoTrue.

## Database-level authenticated journey (NOT live E2E)
Real Core RPCs on replayed DB with simulated JWT claims: catalogue/price/projection visible; MOQ breach rejected by Core (QUANTITY_RULE_VIOLATION); valid add/update; checkout quote and submit; customer isolation; frozen buyer BUYER_NOT_ELIGIBLE; staff gets nothing; anon 42501; retirement hides config/profile. Evidence: `db-level-authenticated-journey.txt`.
**Live authenticated E2E (real Supabase project + identities + built app): BLOCKED** — no authenticated environment; I did not apply the migration to live or branches.

## Buyer integration
- `carton-core-binding.ts`: flag `EXPO_PUBLIC_CARTON_PACKING_PROFILES==="true"` (default **off** → zero Core calls, carton UI unavailable); fetch → `normalizePackingContract` → fail closed on rpc_error / rpc_missing / contract_rejected / 42501 / PGRST202; latest-only guard prevents stale responses; unit mismatch and deactivated cartons drop support.
- `CartScreen` consumes it; checkout readiness remains solely `draft.is_checkout_ready`; no price/GST/MOQ logic duplicated; quantity never altered by carton logic.
- Both RPCs added to deployment allowlist and boundary script; hand-added types.
- Results: **379/379 tests**, tsc, eslint (0 warnings), verify:boundary, verify:decisions, rc:scan, rc:navigation, expo web export, 26-state browser/a11y/reduced-motion harness — all PASS. Renderer/geometry files unchanged vs 448bad9; lockfile unchanged.
- Order validation for carton counts and stale-profile rejection at submit are Core-side (submit RPC does not know cartons); Buyer only displays advisory carton support.

## Security (deep-link / dependency)
- Chain: `getStateFromPath` → `query-string` 7.1.3 → `decode-uri-component` 0.2.2 (ReDoS). Unguarded PoC: 2.4 KB URL ≈ 14.6 s.
- Mitigation: `deep-link-guard.ts` (≤512 chars, ≤24 escapes, malformed escapes rejected) wraps `getStateFromPath`; verified at every library entry (native `useLinking`, web `useLinking`, `useLinkTo`). 7 tests incl. 3000-input fuzz, worst accepted ≈<100 ms.
- Override `decode-uri-component@0.5.1` rejected: ESM-only, breaks the CJS consumer (reproduced).
- **This is mitigation, not remediation.** Remediation requires React Navigation / Expo major upgrade (out of scope). `npm audit` now reports 77 (3 low, 54 moderate, 19 high, 1 critical) with the lockfile unchanged — earlier runs showed 60; the delta is advisory-database drift, not a code change. Release-security decision: **no unconditional security clearance**; release only with the guard and an owner-accepted residual-risk record, and schedule the major upgrade.

## Packing-master import package
`docs/carton-builder/packing-master-import-core/` (also in Core `docs/carton-packing-master-import/`): 3 carton configurations as **draft/unapproved/inactive** (666×6, 888×4, RTC1×10 with documented geometry), empty profile template, draft-only SQL. No SKU mappings, units, approvals or evidence invented. 40 mm RTC excluded. Verified on a real DB: 3 draft rows, buyers see 0.

## Release-order checklist (approver executes; I have not)
Core first:
1. Mission Control assigns the Core work item and an activation ref; review patch `core-packing-profile-v1-final.patch` / bundle.
2. `git fetch` bundle into Core; open PR from `local/carton-packing-profile-v1` against the agreed base (coordinate ordering with #399 so 20261101090000 stays last).
3. CI: `bash scripts/check-migration-governance.sh`, `bash scripts/check-migration-base-monotonicity.sh`, `bash scripts/check-migration-history-sequence.sh <activation-ref>`; run pgTAP file `supabase/tests/buyer_carton_packing_profile_projection_v1.sql` against a Supabase branch.
4. Apply via the protected migration workflow only (never manual SQL). Post-apply verify: both functions exist, anon cannot execute, tables RLS forced, projections return 0 rows.
5. Operations loads packing master via the import package, with evidence and approvals → approved rows.
Then Buyer (only after Core contract is published and verified):
6. Review `local/carton-core-wiring`; build with `EXPO_PUBLIC_CARTON_PACKING_PROFILES=true` for a staged channel only; flag stays off otherwise.
7. Authenticated live E2E with real buyer identities; Android/iOS UAT; then protected release approval.
Rollback: Buyer — unset flag. Core — run the `_down.sql` (drops projections and tables; destroys governance data, so export first).

## Certification matrix
| Item | Status |
|---|---|
| Frozen geometry / 26 states unchanged | PASS |
| Core migration on real PG16 (dry-run/apply/rollback/replay) | PASS (shim, not Supabase) |
| Real pgTAP 57/57 + 5 mutations caught | PASS |
| Concurrency | PASS |
| Tenant isolation / privileges | PASS (simulated claims) |
| Core governance scripts | PARTIAL — history-sequence needs activation ref |
| Buyer 379 tests, tsc, lint, boundary, nav, export | PASS |
| 26-state browser, a11y, reduced motion | PASS |
| Flag-gated Core binding, fail-closed | PASS |
| DB-level journey | PASS (not live E2E) |
| Live authenticated E2E | BLOCKED |
| Deep-link mitigation | PASS (mitigation only) |
| Dependency remediation / security clearance | OPEN |
| Import package | PASS (draft only) |
| Factory trials, artwork sign-off, device UAT, assistive-tech | OPEN (external) |
| Core PR / protected release approval | OPEN (external) |

## Outstanding external actions
1. Mission Control: assign Core work item, activation ref, review/merge/migrate via protected workflows.
2. Operations: packing-master evidence, SKU↔carton mapping approvals.
3. Authenticated Supabase environment with buyer identities for live E2E.
4. Factory trials (888×4 internal length vs printed 20 in; RTC closed stack / 4-high stacking).
5. Print artwork owner sign-off.
6. Android/iOS UAT and assistive-technology testing.
7. Expo / React Navigation major upgrade; security residual-risk acceptance.
8. Protected release approval.
