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
