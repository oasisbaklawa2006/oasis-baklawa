# Core ↔ Buyer packing-profile contract — specification v1 (PROPOSAL)

**Status: proposed. Not implemented. Not approved. Core owns the implementation, and any Core change needs a Mission Control assignment and a protected merge.** The Buyer side of this contract (a fail-closed payload validator) is in `src/lib/packing-profile-contract.ts` on the same branch and is covered by tests.

## 1. Purpose and non-goals

Give the Buyer app, and only the Buyer app, the minimum approved packing facts needed to draw a carton and explain what completes it.

Non-goals:
- It does **not** carry price, GST, cost, margin or stock.
- It does **not** replace MOQ or increment rules. Those stay in the commercial projection (`buyer_product_prices_v1` and the authority function). Core's checkout validation remains the only binding decision.
- It carries **no** physical dimensions or weights. Those stay in the Operations master. The Buyer needs only slot counts.
- It never triggers or reads factory packing, dispatch, DPL, invoicing or Trace state.

## 2. Surface

Two read-only, tenant-gated RPCs. Both follow the existing `buyer_product_prices_v1` pattern: `SECURITY DEFINER`, `STABLE`, pinned `search_path`, first statement checks `customer_buyer_eligible_company_id()` and returns **zero rows** if it is NULL.

### 2.1 `buyer_carton_configurations_v1()`

One row per approved, currently effective carton configuration.

| Column | Type | Rule |
|---|---|---|
| `config_id` | text | Stable id (e.g. `888x4`). Unique with `config_version`. |
| `config_version` | integer ≥ 1 | Highest effective version wins. |
| `label` | text | Buyer-facing name. |
| `family` | text | e.g. `bulk_sweets`. |
| `capacity_slots` | integer ≥ 1 | Physical slots. No upper bound is assumed by the Buyer; the visual switches to a compact meter above 24. |
| `inner_pack` | text | `tray`, `box`, … |
| `slot_columns`, `slot_rows` | integer, nullable | **Only** when the physical arrangement is verified. If both are set, `slot_columns × slot_rows = capacity_slots`. |
| `eligible_packing_groups` | text[] | Groups verified to fit. Empty ⇒ nothing is eligible. |
| `mixable_group_sets` | jsonb (array of arrays of text) | Each inner array is a set of groups that may share one carton. A carton holding one group needs no entry. Every group listed must also be in `eligible_packing_groups`. |
| `visual_asset_keys` | jsonb (object state→asset ref), nullable | Only approved assets. |
| `asset_status` | text | `approved` / `pending` / `missing`. |
| `effective_from`, `effective_until` | timestamptz, nullable | Half-open window; null = unbounded. |
| `approval_status` | text | Always `approved` in this output; unapproved rows are never returned. |
| `contract_version` | integer | `1`. |

### 2.2 `buyer_packing_profiles_v1()`

One row per (orderable product × variant).

| Column | Type | Rule |
|---|---|---|
| `product_id` | uuid | Same id used by `published_products_v1`, `buyer_product_prices_v1` and the draft RPCs. |
| `sku` | text | Display only; identity is `product_id`. |
| `variant_id` | uuid, nullable | **Reserved.** Draft lines are keyed by `product_id` alone today, so the Buyer treats any non-null variant as unsupported until draft lines carry a variant. |
| `packing_group` | text, not null | Assigned by Operations. |
| `conversion_basis` | text | `slot_unit` (v1) or `fixed_ratio` (reserved, see §4). |
| `slots_per_unit` | integer ≥ 1 | Slots one **ordered unit** occupies. Required for `slot_unit`. |
| `ordered_units_per_slot` | numeric, nullable | Reserved for `fixed_ratio`. |
| `commercial_uom` | text, not null | Must equal the `uom` returned by `buyer_product_prices_v1` for the same product. |
| `carton_config_ids` | text[] | Configurations this SKU is verified to fit. |
| `requires_separate_carton` | boolean | Never share. |
| `mix_allowed` | boolean | Mixing permitted at all. `requires_separate_carton` ⇒ `mix_allowed = false`. |
| `full_carton_required` | boolean | Carton must be full. |
| `profile_version` | integer ≥ 1 | Increases on every approved change. |
| `approval_status` | text | Always `approved`. |
| `effective_from`, `effective_until` | timestamptz, nullable | Same semantics as above. |
| `projection_hash` | text | md5 of the row's governed fields for client cache invalidation. |
| `contract_version` | integer | `1`. |

## 3. Packing group and eligibility semantics

- `packing_group` is a physical-compatibility label chosen by Operations. The Buyer never derives it from names, weights or the legacy "N Box" classes.
- A SKU is placeable in a configuration only if **all** hold: the config id is in the SKU's `carton_config_ids`; the config lists the SKU's `packing_group` in `eligible_packing_groups`; both rows are approved and effective.
- Mixing groups A and B in one carton is permitted only if some `mixable_group_sets` entry contains both. Capacity never implies compatibility.

## 4. Units and conversions

- v1 supports `slot_unit` only: the ordered unit is the slot unit (for example a tray), so conversions are integers and exact.
- Loose sweets are stored in **kg** in the master, while carton slots are trays. A kg-to-tray rule (`ordered_units_per_slot`, for example 2.5 kg per tray) needs: (a) a business decision on the ordering unit; (b) evidence per SKU; (c) a Buyer engine extension (exact decimal arithmetic) and an order-increment that is a multiple of the ratio. Until then the Buyer **rejects** `fixed_ratio` rows with `UNSUPPORTED_CONVERSION`, and the SKU simply is not carton-managed.
- `commercial_uom` must match the price projection's `uom` exactly (case-insensitive, trimmed); otherwise the SKU is rejected by the Buyer and flagged by Core's contract tests.

## 5. MOQ, increments and mixing

- MOQ and increments are **not** in this contract. Core continues to enforce `customer_validate_order_quantity_v1`.
- **Proposed companion change (separate approval):** expose `min_carton_qty` and its unit in the commercial projection. Core already enforces `qty % min_carton_qty = 0`, but the Buyer cannot see it, so its stepper can offer quantities Core will reject.
- Carton completeness is advisory. A complete carton may still be commercially invalid, and an incomplete carton never changes a customer quantity.

## 6. Versioning, approval and effectivity

- Only `approved` rows whose window contains `now()` are returned. Draft, pending, rejected, expired and future rows are never exposed.
- Any approved change creates a new `profile_version` or `config_version`; old versions are retained in Core for audit.
- Approval metadata (who/when/evidence reference) lives in Core tables and is **not** returned to the Buyer.
- `contract_version` changes only for breaking shape changes. A Buyer that sees an unknown `contract_version` rejects the whole payload and shows no carton UI.

## 7. Tenant-safe visibility and RLS

- Both functions: `REVOKE ALL … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated, service_role`.
- Zero rows unless `customer_buyer_eligible_company_id()` is non-null (approved, non-frozen buyer company).
- Profiles are returned only for products that are published and currently orderable for that buyer (join to `published_products_v1()` and to an approved price row). This avoids exposing packing data for unorderable or unpublished SKUs.
- The underlying governance tables keep RLS enabled with **no** buyer grants. No view over them is granted to `authenticated`.
- No dimensions, weights, cost, approver identity or evidence references are returned.

## 8. Failure behaviour (Buyer side, implemented in the validator)

| Situation | Behaviour |
|---|---|
| RPC error, offline, non-array payload | Carton UI absent. Browsing, cart and checkout unaffected. |
| Unknown `contract_version` | Whole payload rejected. |
| Row missing a required field, wrong type, non-integer slots, empty group | That row rejected; other rows unaffected. |
| Duplicate profile for the same `(product_id, variant_id)` | All rows for that product rejected (ambiguity). |
| Non-null `variant_id` | Row rejected (`VARIANT_UNSUPPORTED`). |
| `conversion_basis ≠ slot_unit` | Row rejected (`UNSUPPORTED_CONVERSION`). |
| `requires_separate_carton = true` or `mix_allowed = false` | Row rejected (`ENGINE_RULE_UNSUPPORTED`): the Buyer engine cannot yet keep one SKU exclusive (it would still pack same-group SKUs together), so the SKU is not carton-managed until an engine extension is approved. |
| `requires_separate_carton = true` together with `mix_allowed = true` | Row rejected (`RULE_CONFLICT`). |
| Not `approved` / outside effective window | Row rejected. |
| Profile references an unknown or unapproved config | That config id is dropped from the SKU; if none remain, the SKU is rejected. |
| `mixable_group_sets` references a group not in `eligible_packing_groups` | Config rejected. |
| Unknown SKU in the cart | Not carton-managed; shown without carton detail. Never guessed. |

Rejections are returned as typed issues for diagnostics, never thrown into the UI.

## 9. Core-side acceptance tests (to be added by Core, pgTAP)

1. Anonymous and unauthenticated callers get zero rows or a permission error, never data.
2. A buyer from company A and company B receive identical profiles; a frozen/unapproved company receives none.
3. A staff-only account without buyer eligibility receives none.
4. Draft, pending, rejected, expired and future rows are never returned.
5. A product with no approved price returns no profile.
6. `commercial_uom` equals the price projection's `uom` for every returned row (cross-projection test).
7. `requires_separate_carton ⇒ mix_allowed = false` and `slot_columns × slot_rows = capacity_slots` are enforced by CHECK constraints.
8. `projection_hash` changes iff a governed field changes.
9. No dimension, weight, cost or approver column is selectable by `authenticated` on the underlying tables.
10. Golden vectors shared with the Buyer's tests produce the same carton plan in SQL and TypeScript.

## 10. Rollout

1. Mission Control assigns an ASM item to Core. 2. Core adds governance tables and the two RPCs behind no feature flag (they return zero rows until data is approved). 3. Operations returns the packing-master template; Core imports it through the governed path. 4. Buyer binds the RPCs behind its existing carton seam. 5. Non-production integration run (`NONPROD_INTEGRATION_TEST_PLAN.md`). 6. Device UAT.

Rollback: stop returning rows (set rows to non-approved or end-date them). The Buyer reverts to the flat cart with no code change.
