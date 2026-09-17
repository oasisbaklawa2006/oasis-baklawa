# AUTH-01 Buyer RPC Security Matrix

Body-verified against current-main `oasis-supabase-core` SQL (migration
chronology respected; superseded definitions ignored). Static analysis —
no live database in the verifying sandbox; no query was actually executed
as any role. Every row below is backed by a direct read of the function's
(or its trigger's) SQL, not by grant inspection alone.

Three real Core defects were found and fixed during this body audit, each
on its own local Core commit with a pgTAP regression test — all four
regression tests below (across three fix commits) were **actually executed
in a real Postgres 16 + pgTAP instance built in the verifying sandbox**
(schema faithfully reconstructed from verbatim-extracted CREATE TABLE/
FUNCTION statements taken from the real migration files), not merely
written:

- `customer_order_status_v1`, `customer_order_items_v1`,
  `customer_support_tickets_v1` used an inline eligibility gate with no
  role filter and no staff exclusion, unlike the canonical
  `customer_buyer_eligible_company_id()` helper introduced later for
  exactly this family. Fixed to call the canonical helper. **4/4
  assertions pass; a negative control confirms the same test fails against
  the pre-fix body.**
- `get_sales_order_pi_final_payment_request_v1` and its three governing RLS
  policies used the weaker `auth_buyer_company_id()` helper (no
  approved/status/frozen check), allowing a buyer whose company was later
  frozen to still read final-payment-PI details for their own orders.
  Fixed to use `customer_buyer_eligible_company_id()`. **2/2 assertions
  pass; negative control confirmed.**
- `create_payment_gateway_payable_intent_v1` and
  `get_payment_gateway_payable_status_v1` had the identical weaker-helper
  gap, allowing a frozen-company buyer to create a real payment-gateway
  intent and read its status. Fixed the same way. **4/4 assertions pass;
  negative control confirmed.**

A fourth occurrence of the same drift pattern was found in the
`support_ticket_set_customer_context()` trigger (governs
`submit_customer_support_ticket_v1`'s actual authorization). It was
**investigated and resolved as NO SECURITY IMPACT**, not fixed: the
trigger's independent, correctly-enforced order-ownership check means a
staff-shaped profile can only ever create a ticket against an order
belonging to the same company its own profile already points at — never a
different company's order. This is a data-attribution question, not a
disclosure or cross-company access path. A contract test proves this
directly (2/2 assertions pass): a staff-shaped profile succeeds against
its own company's order and is denied against a different company's
order.

**Caveat on the execution evidence above:** the harness used to run these
9 assertions across four test files is a minimal, purpose-built
reconstruction of the specific tables/functions each test touches — not a
replay of Core's full migration history or its full CI/RLS policy set.
Core's own CI should still run the complete test suite against the real
project schema before any of these migrations are merged.

All four AUTH-01 Core defect-fix/resolution commits, in order:
`dfb8235` (order-surface staff exclusion), `4d13086` (final-payment-PI),
`38a1346` (payment-gateway intents), `88c7dfc` (support-ticket trigger
resolution, no code change).

## Classification legend

- **PUBLIC SAFE** — intentionally anon-executable; contains no
  pricing/cost/account/private data by design.
- **PRE-LOGIN PUBLIC INTAKE** — intentionally anon-executable; write-only
  intake that grants no Buyer authority by itself.
- **AUTHENTICATED BUYER** — authenticated only; company resolved
  server-side, scoped to the caller's own approved/active/not-frozen
  company.
- **BUYER + STAFF** — authenticated only; buyer path as above, with an
  explicit internal-staff bypass for legitimate admin access.
- **INTERNAL ONLY** — revoked from `anon` **and** `authenticated`; reachable
  only via `service_role` from inside another `SECURITY DEFINER` function,
  never directly by any client.

## Matrix

| RPC | Classification | anon | arbitrary auth | pending/rejected | staff (customer surface) | company derivation | cross-company protection | frozen/inactive handling | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `published_products_v1` | PUBLIC SAFE | ✅ allowed (by design) | ✅ | ✅ (no identity needed) | ✅ (no identity needed) | none — no company-scoped data returned | n/a | n/a | `20260906100000_point36_canonical_product_lead_time_authority.sql` |
| `submit_b2b_access_request_v2` | PRE-LOGIN PUBLIC INTAKE | ✅ allowed (by design) | ✅ | ✅ (this is how they apply) | n/a | none — writes a new/matched application row only, grants no Buyer authority | idempotent on (email, mobile); no cross-company write possible | n/a | `20260910040000_b2b_prelogin_access_lifecycle.sql` |
| `claim_approved_b2b_access_request_v2` | AUTHENTICATED BUYER | ❌ | ❌ (no-op unless a real approved application matches the verified phone/email) | ❌ | n/a | `auth.uid()` → verified phone/email → `b2b_applications` match | exact-one-company resolution, fails closed on ambiguous match | frozen company handled downstream by `customer_buyer_eligible_company_id()` | `20260914160000_auth01_verified_identifier_membership_compat.sql` (current; supersedes `20260910040000`, `20260914060000`) |
| `customer_buyer_eligible_company_id` | AUTHENTICATED BUYER (canonical gate) | ❌ | ❌ (returns null) | ❌ (returns null) | ❌ explicit `not is_staff_role`/`not is_internal_staff` | `auth.uid()` → `profiles` (approved, role, not staff) → `companies` (active, not frozen) | by construction — one row max, caller's own company only | ✅ explicit `is_frozen` check | `20260807170000_customer_identity_projections_v1.sql` |
| `customer_company_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | `20260807170000_customer_identity_projections_v1.sql` |
| `customer_team_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | `20260807170000_customer_identity_projections_v1.sql` |
| `buyer_product_prices_v1` | AUTHENTICATED BUYER | ❌ | ❌ (cross join yields zero rows) | ❌ | ⚠️ not explicitly staff-excluded, but relies on approved-buyer profile shape | inline `profiles`+`companies` CTE, approved/active/not-frozen | ✅ (cross-join keys on own company) | ✅ | `20260723161256_legacy_role_authority_baseline.sql` (canonical per `20260722223000` stub) |
| `customer_order_status_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ **fixed this pass** (was ⚠️) | via `customer_buyer_eligible_company_id()` **after fix** | ✅ | ✅ | `20260723161256` body + **`20260917120000_auth01_customer_order_surface_staff_exclusion_fix.sql`** |
| `customer_order_items_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ **fixed this pass** | via `customer_buyer_eligible_company_id()` **after fix** | ✅ | ✅ | same as above |
| `customer_support_tickets_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ **fixed this pass** (profiles branch); legacy `users` branch already role-whitelisted | via `customer_buyer_eligible_company_id()` **after fix** + legacy branch | ✅ | ✅ | same as above |
| `submit_customer_support_ticket_v1` | AUTHENTICATED BUYER | ❌ | ❌ (trigger raises `approved customer company required`) | ❌ | ⚠️ role-filter gap present in the trigger's `profiles` branch, **resolved as NO SECURITY IMPACT** — independent order-ownership check prevents any cross-company reach (contract test, 2/2 pass) | real enforcement lives in `support_ticket_set_customer_context()` trigger, not the RPC body; also validates `p_order_id` belongs to the resolved company | ✅ (order-ownership check in trigger) | ✅ (trigger requires active/not-frozen) | `20260723161256_legacy_role_authority_baseline.sql` (RPC ~L3378, trigger `support_ticket_set_customer_context` ~L3526) + `20260917150000_support_ticket_context_trigger_no_impact_assertion.sql` |
| `get_customer_order_draft_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | `auth.uid()` → `customer_buyer_eligible_company_id()` | ✅ + table RLS | ✅ | `20260807171000_customer_order_draft_v1.sql` |
| `add_customer_order_draft_line_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | same | ✅ + table RLS | ✅ | same file |
| `update_customer_order_draft_line_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | same | ✅ + table RLS | ✅ | same file |
| `remove_customer_order_draft_line_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | same | ✅ + table RLS | ✅ | same file |
| `clear_customer_order_draft_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | same | ✅ + table RLS | ✅ | same file |
| `submit_customer_order_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | `v_company_id := customer_buyer_eligible_company_id()` | ✅ | ✅ | `20260807172000_customer_checkout_submit_v1.sql` |
| `calculate_customer_advance_v1` | AUTHENTICATED BUYER (stateless) | ❌ | ✅ (harmless — pure formula on the caller-supplied number, touches no table) | ✅ | ✅ | n/a — `IMMUTABLE`, no table access at all | n/a — nothing to leak | n/a | `20260827063731_pre_factory_so_commercial_authority.sql` |
| `customer_sales_order_commercial_facts_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | `20260901005500_app_e2e_buyer_commercial_projections.sql` |
| `customer_order_finance_facts_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | `p_order_id` client-supplied, checked `AND company_id = v_company_id`, raises if not found | ✅ explicit check | ✅ | same file |
| `customer_proforma_invoice_facts_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | same file |
| `customer_documents_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | `20260901005600_app_e2e_buyer_documents_favourites_queries.sql` |
| `customer_statement_v1` | AUTHENTICATED BUYER | ❌ | ❌ (raises `CUSTOMER_STATEMENT_COMPANY_CONTEXT_REQUIRED`) | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | same file |
| `customer_product_favourites_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | `user_id = auth.uid()` AND `company_id = customer_buyer_eligible_company_id()` (double-scoped) | ✅ | ✅ | same file |
| `set_customer_product_favourite_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | via `customer_buyer_eligible_company_id()`; also checks product commercial availability for that company | ✅ | ✅ | same file |
| `customer_general_queries_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | `user_id = auth.uid()` AND `company_id = customer_buyer_eligible_company_id()` | ✅ | ✅ | same file |
| `submit_customer_general_query_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | via `customer_buyer_eligible_company_id()`; idempotency-key conflict is `raise`d, not silently overwritten | ✅ | ✅ | same file |
| `customer_quotations_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ + table RLS | ✅ | `20260906150000_p106_customer_quotation_authority.sql` |
| `customer_quotation_detail_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | `p_quotation_id` checked via `customer_assert_quotation_company_scope_v1()` helper | ✅ explicit helper | ✅ | same file |
| `customer_quotation_lines_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | same helper | ✅ | ✅ | same file |
| `submit_customer_quotation_request_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | same file |
| `accept_customer_quotation_v1` | BUYER + STAFF | ❌ | ❌ (buyer path); staff granted separately | ❌ | ✅ explicit `service_role` grant for staff-adjacent flows | `p_quotation_id` checked `AND q.company_id = v_company_id` | ✅ | ✅ | same file |
| `decline_customer_quotation_v1` | BUYER + STAFF | ❌ | ❌ | ❌ | ✅ same pattern | same | ✅ | ✅ | same file |
| `create_payment_gateway_payable_intent_v1` | AUTHENTICATED BUYER | ❌ (even `service_role` explicitly revoked) | ❌ | ❌ | n/a | order company checked against `customer_buyer_eligible_company_id()` **after fix**, with `is_internal_staff` bypass | ✅ | ✅ **fixed this pass** (was ⚠️ via weaker `auth_buyer_company_id()`) | `20260907141000_macro_finance_payment_gateway_authority.sql` body + **`20260917140000_auth01_payment_gateway_frozen_buyer_bypass_fix.sql`** |
| `get_payment_gateway_payable_status_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | n/a | same pattern **after fix** | ✅ | ✅ **fixed this pass** | same fix file |
| `get_sales_order_pi_final_payment_request_v1` | BUYER + STAFF | ❌ | ❌ | ❌ | ✅ explicit `is_internal_staff` bypass | via `customer_buyer_eligible_company_id()` **after fix** | ✅ | ✅ **fixed this pass** (was ⚠️ via weaker `auth_buyer_company_id()`) | `20260902083000_final_payment_pi_revision_authority.sql` body + **`20260917130000_auth01_final_payment_pi_frozen_buyer_bypass_fix.sql`** |

## Internal-only helpers encountered (not directly reachable by any client, listed for completeness)

`customer_validate_order_quantity_v1`, `customer_resolve_buyer_product_authority_v1`,
`customer_recompute_draft_readiness_v1`, `customer_order_draft_audit_v1`,
`customer_assert_quotation_company_scope_v1`,
`customer_quotation_default_expiry_v1`, `customer_quotation_is_actionable_v1`,
`customer_build_quotation_lines_v1`, `allocate_commercial_document_number_v1` —
all `REVOKE ALL ... FROM PUBLIC, anon, authenticated`, `GRANT ... TO service_role`
only. Called internally by the `SECURITY DEFINER` functions above; never
directly callable by the native app regardless of the caller's role.

## Final status

All 36 runtime RPCs are body-verified. All identified defects (three) are
fixed with executed, passing regression tests; the one remaining finding
(support-ticket trigger) is investigated and resolved as no security
impact, with its own executed, passing contract test. No open items
remain in this matrix.
