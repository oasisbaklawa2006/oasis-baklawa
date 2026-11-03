# Core integration and release-clearance report (31 Oct 2026)

Baseline `e03a61f`. Core proposal: isolated clone commit `4eba823` on `local/carton-packing-profile-v1` (from Core `main` `20708e7`); original Core clone untouched; **nothing applied to any database**.

## 1. Canonical authorities (from live definitions read with SELECT, and the Core repository)
| Concern | Canonical authority | Buyer use |
|---|---|---|
| Who is an eligible buyer | `customer_buyer_eligible_company_id()` (approved, non-frozen, non-staff buyer company) | gate on every projection |
| Which products are orderable | `published_products_v1()` ∩ approved B2B `product_pricing_rules` via `buyer_product_prices_v1()` | packing facts only for these |
| Price, GST, currency, unit | `product_pricing_rules` (approved) through `buyer_product_prices_v1()` | untouched |
| MOQ and increment | `product_moq_rules` (b2b) with `products` fallbacks through `buyer_product_prices_v1()`; enforced by `customer_validate_order_quantity_v1` | untouched; client pre-check only |
| Draft lines / quantities | `get/add/update/remove/clear_customer_order_draft_v1` | untouched; the carton view never writes |
| Financial validation, advance, submission | `customer_checkout_quote_v1`, `calculate_customer_advance_v1`, `submit_customer_order_v1` | untouched |
| Product dimensions and packaging types | `products.carton_type`, `packs_per_master_carton`, `kg_per_master_carton`, … (legacy, unapproved, not exposed to buyers; classes do not map to carton configurations) | **not used** |
| Customer-specific MOQ | none: MOQ is per product and channel; only `companies.discount_percentage` is per customer | n/a |
| Carton eligibility, capacity, packing profile, versioning, activation | **none exists** (live schema: only dispatch/Trace/finance carton objects) | new governed data required |
| Carton allocation of buyer orders | none; dispatch cartons are created later by factory flows and must not be conflated | allocation stays an illustration |

**Answer to "derive from existing data?"** Only in part. Buyer eligibility and orderability are derived from existing authorities (the projection joins them; it adds no price, MOQ or product master). The packing attributes themselves (packing group, slots per ordered unit, carton configurations) exist nowhere governed, so two small governance tables are unavoidable. They hold no prices, tax, dimensions or weights.

## 2. The Core proposal (reviewable patch: `core-packing-profile-v1.patch`)
- `carton_configurations`, `product_packing_profiles`: versioned, effective-dated, approval status with approver, time and evidence reference required to approve; CHECK constraints (grid = capacity, `requires_separate_carton ⇒ ¬mix_allowed`, slot-unit/fixed-ratio shape, variant reserved); trigger makes approved rows immutable (change = new version; only retire); trigger validates mixable groups ⊆ eligible groups.
- RLS enabled **and forced**, no policies, no grants to `anon`/`authenticated`; `service_role` select/insert/update.
- `buyer_carton_configurations_v1()` and `buyer_packing_profiles_v1()`: SECURITY DEFINER, pinned search_path, `authenticated`/`service_role` only. Rows only for an eligible buyer; approved and currently effective (half-open window); highest version wins; profiles only for products in `buyer_product_prices_v1()` whose unit equals the price unit; `fixed_ratio` not served; non-live configuration ids dropped; no dimension/weight/approver/evidence/price columns.
- Rollback `supabase/rollback/…_down.sql` (drops the two functions, two tables and two helper functions; leaves price authority untouched).
- Timestamp `20261101090000` sorts after the latest migration on both `main` (`20261027130000`) and the #399 release train (`20261029030000`); it creates no object that #399 touches. Order, naming and merge remain Core/Mission Control decisions.

## 3. Verification actually performed
In an **in-memory Postgres (pglite), not Core's pgTAP/Supabase runtime**: the five Core functions the projection depends on are loaded **verbatim from the live definitions**; the migration is applied; `supabase/tests/buyer_carton_packing_profile_projection_v1.sql` (37 assertions in pgTAP style, run through a small pgTAP-compatible shim) passes: anonymous denial, no direct table access, tenant gating (frozen, pending, staff, no-profile callers get nothing), identical facts for two buyer companies, price authority unaffected, unit-match, version selection and fallback, immutability, half-open window, constraints, no sensitive columns; the rollback leaves zero objects. Four deliberate mutations (inclusive window, dropped unit join, dropped buyer gate, dropped slot-unit filter) are each caught. It has **not** been run under Core's real pgTAP, RLS policies of the full schema, or against any Supabase project.

## 4. Buyer consumer
`packing-profile-contract.ts` (existing, fail-closed) plus new `carton-support-loader.ts`: calls the two RPCs, applies the price-unit map, returns `CartonSupport`; any missing function, error or contract rejection yields "unavailable". 6 new tests cover success, missing/denied/throwing RPCs, junk payloads, unapproved rows, unit mismatch, version change, partial carton and MOQ failure. **It is deliberately not wired into the cart** and the two RPC names are **not** added to `BUYER_DEPLOYMENT_RPC_ALLOWLIST` / `required-rpc-bindings`, because adding them before Core publishes them would fail the deployment gates and call a missing function in production. Activation steps are listed in the module header.

## 5. Authenticated end-to-end journey
**BLOCKED, with evidence:** no Supabase environment with the proposal applied exists; the only preview branch (#399 train) has `MIGRATIONS_FAILED` and no data; no buyer test identities are available; applying the migration to production is prohibited. The strongest available substitutes are the contract/journey/pglite tests above. Cross-account isolation is proven at the SQL level (frozen/staff/pending/other-company cases) in the emulation only.

## 6. Release-clearance verdict
Software: the Buyer-side consumer and a reviewable Core proposal are complete and tested in isolation. **Not releasable**: Core must review, assign, merge and apply the migration through protected governance; Operations must supply and approve packing data; an authenticated environment is needed for the live journey; physical, artwork, device, assistive-technology and owner gates and the security migration remain open.
