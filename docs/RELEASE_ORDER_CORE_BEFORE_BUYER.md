# Release order: Core first, Buyer second (PR #69)

Buyer #69 must **not** be deployed (EAS/store/OTA) until every Core item below is released to production **and verified**.

| Step | Core change | PR | Verified by |
|---|---|---|---|
| 1 | Carton projection `20261101090000` | Core #471 | `buyer_carton_configurations_v1` / `buyer_packing_profiles_v1` exist; projection pgTAP |
| 2 | Carton enforcement `20261101100000` (default OFF) | Core #472 (after #471) | enforcement settings row present and OFF; pgTAP |
| 3 | Atomic cart `add_customer_order_draft_line_if_absent_v1` `20261102090000` | Core #477 | function present; concurrency evidence; anon denied |
| 4 | Address/transporter RPCs `20261102100000` | Core #478 | the five RPCs present; tenant-isolation tests |

Flags (all must stay OFF until approved):
- Core carton enforcement: **OFF** until approved product-master packing configuration, authenticated E2E and operational acceptance are complete.
- Buyer `EXPO_PUBLIC_CARTON_PACKING_PROFILES`: **OFF** until step 1 is verified.

Degradation if the order is violated: without step 3 the Buyer falls back to a fresh-read guard (not race-free, reported as `usedFallback`); without step 4 the address/transporter screens fail as they do today; without step 1 the carton UI stays unavailable (fail closed).
