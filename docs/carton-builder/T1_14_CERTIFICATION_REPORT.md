# Task 1 — Certification report (revision 2, 30 Oct 2026)

Repository `oasisbaklawa2006/oasis-baklawa` · branch `feat/carton-moq-builder-config-v1` · **draft** PR #66 · base `main` @ `e5096cf` · tracking issue #64.

## Overall verdict: **BLOCKED — not certifiable**

The software foundation is implemented, reviewed and green at the audited head. Certification is blocked by data and evidence that do not exist inside this repository. Each blocker is named, owned and described in the owner-action register (`docs/carton-builder/OWNER_ACTION_REGISTER.md` on the separate draft preparation branch `prep/t1-packing-contract-v1`, which is deliberately not part of PR #66).

## Revision history (evidence trail)

| Rev | Code head | Tests | What changed |
|---|---|---|---|
| 1 | `9651652` | 257 (local) | First report. Said CI "pending". Said Snyk/Codacy not inspected. |
| 2 (this) | audited head `94f3d39` (docs-only commit on top) | **262/262**, CI and local | Adds exact-head CI results, review-thread disposition, owner-pushed fixes, post-audit data findings. Corrects the stale PR description. |

Commits since rev 1 that are **not** mine: `a03aa6b`/`1764b7c` (oversized-SKU phantom carton), `fe651a0`/`8568d19` (mis-keyed profile rejected). Both were reviewed here, re-run locally, and keep every gate green.

## Exact-head evidence at `94f3d39…` (re-fetched 30 Oct 2026)

| Check | Result |
|---|---|
| Buyer boundary, navigation, typecheck, lint and tests | success. CI log (job `123902179240`): `# tests 262`, `# pass 262`, `# fail 0`, `# skipped 0`, `# cancelled 0`, 51 suites |
| `quality` | success |
| Tranche-5 binding and authenticated certification | success (authenticated **read-only** RPC probes; finance-facts probe skipped — no orders) |
| Core backend authority | success |
| Codacy | success, 0 new issues |
| Snyk (commit status) | success |
| CodeRabbit | check **skipped** (draft PR); owner-requested incremental review covered `8568d19`; later fixes were confirmed by source inspection, not a formal review of `94f3d39` |
| Review threads | 6 of 6 resolved; no human APPROVED review |

## Completed vs unverified vs external

- **Completed software (unit-tested, CI green):** configuration-driven carton engine with fail-closed verified-profile eligibility and own-property/identity checks; commercial pre-check that never alters quantities; accessible reduced-motion-aware `CartonVisual`; cart seam that renders only with verified data; Catalogue / Quick Order / Order Again overwrite protection (including draft-read-failure pause and refresh on focus); Genie no longer raises or rounds quantities and rejects unit mismatches; Buyer #60 message repair.
- **Unverified at runtime:** all cart and Genie behaviour against a real draft RPC; carton UI on any device (it is dormant — no packing data is published to buyers); TalkBack, reduced motion and Android performance; offline recovery.
- **External:** see the blocker table.

## Post-audit data findings (read-only, SELECT-only, 30 Oct 2026)

1. **Loose-sweet pricing is a governance and projection gap, not an absence of price data.** All 147 active `bulk_sweets` carry legacy price columns on `products` (for example `price_b2b` > 0 on 147, `price_b2b_per_carton` > 0 on 146). None has an **approved** B2B row in `product_pricing_rules` (2 rules exist, both draft; 1 pricing draft pending approval). Core's buyer projection reads only approved rules, so none is orderable. The legacy columns have no approval or provenance field, so they must **not** be treated as approved prices.
2. **GST.** The product master carries a GST rate for all 147. For the 10 approved B2B rows whose rule `gst_rate` is NULL, the product-level rate is present; for 2 other priced products the rule and product rates **disagree**. Finance must decide which is authoritative; the Buyer applies no default.
3. **Legacy carton classes do not map to physical carton configurations.** The 85 SKUs in "Large Master (8 Box)" span 7 different `kg_per_master_carton` values; physical dimensions and `pcs_per_primary_pack` are empty for all 147; no SKU name indicates tray count. A class cannot be converted to a tray capacity without per-SKU evidence.
4. **Core #399 is unrelated to these data gaps.** It adds payment-provider runtimes, address and transporter writes; its file list has no packing, pricing or GST change.

## Matrix

| ID | Verdict | Note |
|---|---|---|
| T1.01 census | PASS | |
| T1.02 reconciliation | BLOCKED | Census complete; per-SKU mapping evidence absent |
| T1.03 engine | PASS | |
| T1.04 888×4 visual | BLOCKED | Logic done; approved artwork not supplied; schematic only |
| T1.05 six/ten | BLOCKED | Engine verified for 6 and 10; no geometry or artwork |
| T1.06 mixed variants | PASS (engine) | No real SKU data to exercise |
| T1.07 commercial | PASS (pre-check) | Core stays authoritative |
| T1.08 catalogue | PARTIAL | #60 repaired; remaining surfaces not exercised on a device |
| T1.09 draft cart | PASS (repaired paths) | Unit-level only |
| T1.10 discovery | PARTIAL | |
| T1.11 Genie / reorder | PASS (unit) | |
| T1.12 frontend quality | NOT VERIFIED | No device run |
| T1.13 testing | PASS locally and at exact-head CI; PARTIAL overall | No formal human or CodeRabbit approval of the final head |
| T1.14 evidence | PASS | This report |

## Verified here vs only reported by others

- **Verified by me this session:** PR/CI/threads/tests above; the census in the `T1_02` document and the post-audit findings above.
- **Reported by the owner's release-watch comments, not re-probed:** legacy `submit_customer_order_v1` still executable by authenticated users; two security-definer views readable by authenticated users; Core #399 preview-check failure and 2 unresolved payment threads; Central #632 Android/MSG91 state; golden-path "no orders" skip and null `originMainSha`.

## Release gates (unchanged)

PR #66 stays draft. Do not merge or deploy it, or #65, #61 or #59. Green CI is not certification.
