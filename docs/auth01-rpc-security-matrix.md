# AUTH-01 Buyer RPC Security Matrix

Body-verified against the Buyer runtime allowlist and the corresponding
current production Core SQL. The matrix below records the authority that is
actually live in production, not a local or pending branch target.

Verification state as of 2026-09-18:

- Core PR #330 is merged on Core main at
  `bd3dfe80c0a20d299be143fa0927a7289eade3e6`, and its protected production
  migration `20260917170000_support_ticket_idempotency_v2` is live. The
  allowlisted `submit_customer_support_ticket_v2` contract is therefore
  available in production while v1 remains for older Buyer builds.
- Core PR #326 is merged at
  `715a030bc06eb72f15e6e3a274fbf63acc831c8d`. Protected Production Migration
  Release #210 completed successfully, and production contains
  `20260918010000_auth01_buyer_rpc_identity_gate_hardening` plus
  `20260918010100_auth01_support_ticket_uuid_text_guard_compat`.
- Production body inspection confirms `buyer_product_prices_v1`,
  `customer_order_status_v1`, `customer_order_items_v1`, and
  `customer_support_tickets_v1` now use the canonical
  `customer_buyer_eligible_company_id()` Buyer gate.
- Production body inspection also confirms `auth_buyer_company_id()` is now
  centrally hardened through the canonical Buyer gate with explicit staff
  handling. Payment/final-payment RPCs that call this shared helper therefore
  inherit the hardened approved/active/not-frozen Buyer resolution.
- The former **PENDING CORE HARDENING** release blocker is closed.

Every row is based on direct function/trigger/policy body inspection, not grant
inspection alone.

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
| `buyer_product_prices_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | production `20260918010000_auth01_buyer_rpc_identity_gate_hardening.sql` |
| `customer_order_status_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | production `20260918010000_auth01_buyer_rpc_identity_gate_hardening.sql` |
| `customer_order_items_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (via canonical gate) | via `customer_buyer_eligible_company_id()` | ✅ | ✅ | production `20260918010000_auth01_buyer_rpc_identity_gate_hardening.sql` |
| `customer_support_tickets_v1` | AUTHENTICATED BUYER | ❌ | ❌ | ❌ | ❌ (canonical Buyer path excludes staff) | canonical `customer_buyer_eligible_company_id()` with preserved governed legacy compatibility | ✅ including company-bound order metadata | ✅ | production `20260918010000_auth01_buyer_rpc_identity_gate_hardening.sql` + `20260918010100_auth01_support_ticket_uuid_text_guard_compat.sql` |
| `submit_customer_support_ticket_v2` | AUTHENTICATED BUYER | ❌ | ❌ (`customer_buyer_eligible_company_id()` must resolve before any insert) | ❌ | ❌ canonical Buyer helper excludes internal staff | `auth.uid()` → `customer_buyer_eligible_company_id()` scopes advisory lock/dedup; `support_ticket_set_customer_context()` independently validates order/company ownership | ✅ canonical company scope + trigger order ownership | ✅ canonical helper rejects inactive/frozen companies | production `20260917170000_support_ticket_idempotency_v2.sql` |
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
| `create_payment_gateway_payable_intent_v1` | BUYER + STAFF | ❌ (even `service_role` explicitly revoked) | ❌ (buyer path) | ❌ (buyer path) | ✅ explicit internal-staff bypass | buyer path uses hardened `auth_buyer_company_id()` → canonical Buyer gate | ✅ company comparison | ✅ hardened helper rejects inactive/frozen Buyer companies | `20260907141000_macro_finance_payment_gateway_authority.sql` + production `20260918010000_auth01_buyer_rpc_identity_gate_hardening.sql` |
| `get_payment_gateway_payable_status_v1` | BUYER + STAFF | ❌ | ❌ (buyer path) | ❌ (buyer path) | ✅ explicit internal-staff bypass | buyer path uses hardened `auth_buyer_company_id()` → canonical Buyer gate | ✅ company comparison | ✅ hardened helper rejects inactive/frozen Buyer companies | `20260907141000_macro_finance_payment_gateway_authority.sql` + production `20260918010000_auth01_buyer_rpc_identity_gate_hardening.sql` |
| `get_sales_order_pi_final_payment_request_v1` | BUYER + STAFF | ❌ | ❌ (buyer path) | ❌ (buyer path) | ✅ explicit `is_internal_staff` bypass | buyer path uses hardened `auth_buyer_company_id()` → canonical Buyer gate | ✅ company comparison | ✅ hardened helper rejects inactive/frozen Buyer companies | `20260902083000_final_payment_pi_revision_authority.sql` + production `20260918010000_auth01_buyer_rpc_identity_gate_hardening.sql` |

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

All 36 Buyer runtime RPCs are accounted for, including the allowlisted
`submit_customer_support_ticket_v2`. Core #330 support-ticket v2 and Core #326
AUTH-01 Buyer-authority hardening are both merged, protected-production
deployed, and reverified. The backend authority dependency for this Buyer PR is
therefore **release-complete**; remaining release gates belong to the Buyer PR
itself (exact-head CI/review/approval and physical mobile UAT).
