# Investigation — loose-sweet pricing deficiency and legacy carton classes (30 Oct 2026)

Method: read-only `SELECT` against the `oasis-baklawa` Supabase project, plus source reading of the repo and Core migrations. No write, approval, migration or price was entered, copied or inferred. Counts only; no price value is reproduced here. Population "bulk" means `products.is_active AND product_family = 'bulk_sweets'` (147 rows, 147 distinct SKUs, 146 distinct names).

## Part A — Is the pricing deficiency missing prices, or a missing projection/mapping?

### Answer
**It is a governance/publication gap. Price figures exist in legacy product-master columns, but none has been approved into the governed price source that Core's buyer projection reads.** It is not a projection bug and not a lost archive. Whether the legacy figures are correct, current or approved cannot be determined from the data.

### Evidence

1. **What Core projects.** The live `buyer_product_prices_v1()` reads only `product_pricing_rules` rows with `price_channel = 'b2b'`, `approval_status = 'approved'`, a positive price and a valid window, for published products. (Definition read from the live function.) It works: 12 other active products project correctly.
2. **Governed rules for the 147.** Rules exist for 2 bulk products (1 b2b, 1 retail), both `draft`. Approved in any channel: **0**.
3. **Pending governance items.** One `catalogue_pricing_drafts` row and one `catalogue_moq_drafts` row are `pending_approval` (table-wide; not shown to be bulk). `pricing_slabs` has 5 rows (table-wide). These are the only approval-path artefacts and none covers the 147.
4. **Legacy price columns on `products`.** `price_b2b` > 0 on 147; `price_b2b_per_carton` > 0 on 146; `price_per_kg` > 0 on 146; `base_price` > 0 on 73; `price_b2b_per_pack` and `mrp_per_primary_pack` are populated but **zero** on all. `price_b2b_per_carton` equals `price_b2b_per_pack × packs_per_master_carton` on only 1 row, so the legacy columns are not internally consistent. The table has no `updated_at` and no approval or provenance column (creation dates 25 Mar–22 Apr 2026).
5. **Archive.** `cleanup_archive.final_product_pricing_snapshot_20260722` has 11 rows and none belongs to a current bulk SKU, so it is not a source for them.
6. **Unit ambiguity.** Prices could be per kg, per pack or per carton; the master columns disagree in meaning. This must be decided before any price is published.

### GST (affects #60 as well)
- The product master carries `gst_rate`, `gst_percentage` and `hsn_code` for all 147 bulk products.
- Among the 12 active products with approved B2B rules, **10 have a NULL `gst_rate` on the rule** although the product row has a GST value, so the Buyer correctly drops them (checkout also requires GST). For **2 products the rule's GST differs from the product's GST.**
- The projection takes GST from the rule only. Which source is authoritative is a **Finance decision**; the Buyer applies no default and the client must not choose.

### What this does not establish
Whether any legacy figure was ever approved; which unit it is expressed in; whether it is current. Nothing here approves, copies or publishes a price.

### Next step (owner: Finance + Core)
Finance states which source is authoritative and in which unit, then approves rules through the existing catalogue pricing-draft flow. Core's projection needs no change for prices; it needs a decision on GST precedence.

## Part B — Legacy 8-box / 24-box and other classifications

### What the data says
| `carton_type` | SKUs | `packs_per_master_carton` | distinct `kg_per_master_carton` | SKU-suffix pattern |
|---|---|---|---|---|
| Small Master (4 Box) | 7 | 4 | 1 (6.00) | all `-6000` |
| Medium Master (6 Box) | 15 | 6 | 2 (1.00–3.00) | `-3000` ×9, `-1000` ×5, `-3` ×1 |
| Large Master (8 Box) | 85 | 8 | 7 (0.70–1.50) | mostly `-1000` (55); also 1500, 1300, 700, 900, 800, 1200, `-1`, and one `-6000` |
| Jumbo Master (24 Box) | 39 | 24 | 1 (0.50) | `-500` ×38, one `-1000` (`OAS-BLU-1000`) |
| Jumbo Master (1000 Box) | 1 | 1000 | 1 (1.00) | `-1000` (`OAS-ORA-1000`) |

Across all five classes: `primary_pack_weight_kg` = 0, `pcs_per_primary_pack` = 0, `carton_dimensions_cm`, product dimensions, `carton_qty`, `packs_per_carton` and `carton_logic` are empty, and no product name mentions a tray count. Units are `kg` for 145, `Kg` for 1, `pcs` for 1.

### Conclusions (and what is NOT concluded)
1. The label is simply "N boxes per master carton", with N equal to `packs_per_master_carton`. It describes a *master packing count*, **not a tray capacity or packing group**.
2. A class does not identify one physical configuration: the 8-box class holds 7 different weights, and the `kg_per_master_carton` values have no consistent meaning (0.50 for a 24-box carton cannot be its weight).
3. Only the 4-box (7) and 6-box (15) classes *numerically resemble* the approved 4- and 6-slot configurations, and none is classed 10. This resemblance is **not** a mapping. 124 SKUs sit in classes with no corresponding configuration.
4. The business owner has stated that all loose sweets fit the three initial configurations. That decision stands. It means *Operations must assign each SKU to a configuration with evidence*; it does not mean the legacy class can be converted automatically.
5. Outliers needing Operations confirmation: `OAS-ORA-1000` (1000-Box), `OAS-OSH-6000` (8-Box with a 6000 suffix), `OAS-BLU-1000` (24-Box with a 1000 suffix), `OAS-LAT-1000` (unit `pcs`), `OAS-KIT-6000` (unit `Kg`).
6. SKU-suffix patterns are observations only and must not be used as a rule.

### Handling in software
Legacy classes are neither overwritten nor treated as exclusive options. They appear only as read-only context in the template. The Buyer engine reads none of them; it reads verified profiles only (see the contract spec).

## Reproducing the checks (read-only)
Examples (run in a read-only SQL console):
```sql
-- governed price coverage for the 147
select count(*) filter (where lower(r.approval_status)='approved') approved_rules
from products p join product_pricing_rules r on r.product_id=p.id
where p.is_active and p.product_family='bulk_sweets';
-- legacy class shape
select carton_type, count(*), count(distinct kg_per_master_carton)
from products where is_active and product_family='bulk_sweets' group by 1;
```
