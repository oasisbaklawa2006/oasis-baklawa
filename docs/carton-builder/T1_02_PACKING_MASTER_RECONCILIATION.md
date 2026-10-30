# T1.02 — Carton packing-master reconciliation (30 Oct 2026)

Status: **Business scope clarified and self-certified; per-SKU assignments and technical validation pending**.

## Approved buyer-facing policy
Initial illustrated loose-bulk configurations: 888×4 (4 trays), Type B (6 inner boxes), Type C (10 trays). Compatible mixed variants permitted only with verified packaging, physical dimensions, SKU minima and backend acceptance. Sealed-carton illustration is buyer-only and must never mutate dispatch/Trace packing status. Other product families retain existing rules.

## Read-only production findings
Project: oasis-baklawa (Supabase). `public.products` has `product_family`, `carton_type`, `carton_logic`, `carton_qty`, `packs_per_carton`, `master_carton_qty`, `carton_dimensions_cm` and additional packing attributes. Grouping **active** products by these fields showed the following `bulk_sweets` classifications: Large Master (8 Box): 85; Jumbo Master (24 Box): 39; Medium Master (6 Box): 15; Small Master (4 Box): 7; Jumbo Master (1000 Box): 1. Counts are records, not approved compatibility mappings. These groups have null `carton_logic`, `carton_qty` and `packs_per_carton` in the grouped result. Existing operational `b2b_dispatch_cartons`, `b2b_dispatch_carton_items`, `ols_cartons` and `dispatch_cartons` are physical workflow data, **not** buyer-carton configuration.

## Owner clarification — approved 30 October 2026
The 4/6/10 configurations are **only the first three illustrated carton types**, not the full company carton inventory. The business owner self-certifies that **all current loose bulk sweets can be accommodated across these three types**. Existing 8/24/other carton classifications are legitimate wider packing-master data, not a reason to block development or to overwrite their records. Four-tray geometry and imagery are approved; six- and ten-unit geometry and imagery are in progress. Build the expandable engine and four-tray preview now, with later carton types addable through configuration. SKU-specific carton assignment and mixed-variant eligibility must still be verified, and backend commercial MOQ authority remains unchanged.

## Remaining implementation decisions pending evidence
- Existing 4/6/8/24/1000 classifications coexist with the approved initial illustrated 4/6/10 rollout; no automatic conversion or deletion is authorised.
- Verify packing-master ownership, carton internal dimensions, tray dimensions and orientation, product-to-packaging SKU mappings, compatibility groups, UOM and per-SKU minimums.
- Verify which commercial projection/RPC supplies approved buyer packing data; never expose raw unrestricted product master to customers.
- Develop the three-type configuration architecture immediately. Enable SKU ordering only where assignment, physical slot rules and commercial contract are verified; the 888×4 illustrative preview can be built independently.
- Do not modify Core pricing, RLS, production packing/dispatch, DPL, financial functions or existing checkout guards.

## Next scoped implementation
Create typed versioned carton configuration/slot-allocation utilities with fail-closed unknown compatibility; unit tests for 0..4 state progression, mixed eligible SKUs, incompatible SKU rejection, partial carton, and physical-full/commercial-invalid separation. Use approved geometry/assets only. Integrate with catalogue/cart after contract and mapping verification.

## Evidence limits
This is a live read-only schema/data census, not signed factory geometry, complete packing-master audit, test execution or release certification. Parent: Buyer #64. Development branch: `feat/carton-moq-builder-config-v1` based on `e5096cfa37049743a3c3d768948943c03b10612b`.

---

## Addendum — live read-only census (30 Oct 2026, project `oasis-baklawa`, SELECT-only)

**Active `bulk_sweets` products: 147.** Visible in catalogue: 146. `is_catalogue_ready`: 0.

| `carton_type` (existing master data) | `packs_per_master_carton` | Active SKUs |
|---|---|---|
| Small Master (4 Box) | 4 | 7 |
| Medium Master (6 Box) | 6 | 15 |
| Large Master (8 Box) | 8 | 85 |
| Jumbo Master (24 Box) | 24 | 39 |
| Jumbo Master (1000 Box) | 1000 | 1 |

Observations (facts only — nothing was changed):
- `carton_type` is a master-data classification of "N boxes per master carton". It is **not** a packing-group, tray-slot or compatibility mapping. Only the 4-Box (7 SKUs) and 6-Box (15 SKUs) rows numerically resemble the approved 4- and 6-slot configurations; **no active bulk SKU is classified 10**. 124 of 147 SKUs sit in 8- and 24-box classes that do not correspond to any of the three approved configurations. The owner certification ("all loose sweets fit the three types") therefore **cannot be reconciled with the data without per-SKU evidence**; no mapping was inferred or written.
- `carton_dimensions_cm`, `carton_qty`, `packs_per_carton`, `carton_logic`, `master_carton_qty`: NULL for every active bulk SKU. Physical dimensions are unverified.
- `fixed_carton_required` is NULL/false on bulk SKUs; commercial units are `kg` (`uom`/`b2b_uom`), while carton slots are trays/boxes. **No kg→tray conversion is published for buyers**, so slots-per-unit cannot be derived.
- Commercial data: **0 of 147** active bulk SKUs have an approved B2B price rule (1 draft B2B rule). Product-level `moq_value` = 1 with NULL `moq_uom` and NULL increment for all 147; only 1 has a `product_moq_rules` b2b row (uom `carton`, no increment). Core's `buyer_product_prices_v1()` therefore projects **no price for any loose bulk sweet**, and Buyer correctly treats them as not orderable.
- Packing-group / mixed-variant / retail-ready / nuts / dates / gifting compatibility rules: **no table or column exists** for buyer-safe compatibility groups. `product_moq_rules.min_carton_qty` is NULL for every bulk SKU.
- No Core RPC exposes per-SKU packing data to buyers (`pg_proc` has none for carton/packing-group projection).

## Buyer #60 — verified root cause
Population note: the "0 of 147" bulk-sweet price count above is filtered to `product_family = 'bulk_sweets'`. The figure below is a different population: all 12 active products (any `product_family`: 10 with NULL family and 2 `General`, verified by query; SKUs such as `…-LOOSE-…`/`…-BULK-…`) that have an approved B2B price rule with price > 0. 0 of those 12 are in the `bulk_sweets` family, so the counts are consistent. Of those 12 active products with an approved B2B price rule, **10 have `gst_rate IS NULL`** (including *Bourma Pistachio* `OAS-AS-BKL-PST-LOOSE-9922` and *Chocolate Cashew Assiyah* `OAS-AS-BKL-CSH-BULK-0001`, b2b ₹1860/kg and ₹850/kg). Core's projection returns those rows; `normalizeBuyerProductPrice` rejects rows without a GST rate (also required by `customer_checkout_quote_v1`), so the product has no client price. The catalogue then showed "Sign in as an approved buyer for pricing". Two causes:
1. **Data (Finance/Core governance, outside this repo):** GST rate missing on approved price rules.
2. **Frontend (repaired here):** misleading message for an already-approved buyer. Ordering remains fail-closed.

## External dependencies (not implementable from Buyer)
1. **Core**: buyer-safe projection of verified packing profiles (packing group, slots per unit, commercial UOM, carton-config eligibility, mixable group sets). Owner: Core / packing master.
2. **Packing master**: per-SKU assignment evidence for the 147 bulk SKUs against 4/6/10 (or approved additional configurations), kg↔tray conversion, internal dimensions and tray orientation.
3. **Finance/Core**: approved B2B prices with GST for bulk SKUs; GST rate for the 10 priced products; MOQ UOM/increment.
4. **Artwork**: approved 888×4 artwork (six states) and geometry were not accessible to this run (none in repo, no source supplied); Types B/C geometry/artwork in progress by the owner.
