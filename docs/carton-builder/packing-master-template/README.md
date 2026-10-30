# Operations packing-master template — loose bulk sweets (147 SKUs)

**Status: TEMPLATE. Every Operations field is intentionally blank. Nothing here is verified packing data.**

File: `PACKING_MASTER_TEMPLATE.csv` — 147 rows, one per active `product_family = 'bulk_sweets'` product, keyed by `sku` (unique; verified 147/147). Rows are sorted by SKU. `product_name_master` is the master name with surrounding whitespace trimmed; two SKUs share the name "Paan Chocodates" (`OAS-PAA-1000`, `OAS-PAA-700`), so always key on `sku`.

## Rules for the person filling it in

1. Fill only from physical measurement, a signed packing specification, or an existing controlled document. Put its reference in `evidence_reference`. **A row without evidence is treated as unverified and rejected by Core.**
2. Never copy a value from the legacy columns into the physical fields. The `__READ_ONLY` columns are shown only to help you find the SKU; they are not tray counts (see `PRICING_AND_LEGACY_CLASS_INVESTIGATION.md`).
3. Leave a cell blank when unknown. Blank means "unknown", and unknown means the SKU is not carton-managed. Never write 0, N/A or "TBD" in a numeric field.
4. Do not enter prices or GST. Those are Finance's, in the governed pricing flow.
5. Return the file unchanged in structure (same header, same row order). Add notes only in `notes`.

## Fields

| Column | Who fills | Type / allowed values | Meaning |
|---|---|---|---|
| `sku` | pre-filled | text | Product identity. Do not edit. |
| `product_name_master` | pre-filled | text | Name in the product master. |
| `legacy_carton_type__READ_ONLY` | pre-filled | text | Legacy classification ("N Box" master). **Not** a tray capacity. |
| `legacy_packs_per_master_carton__READ_ONLY` | pre-filled | number | Legacy count behind the label. |
| `legacy_uom__READ_ONLY` | pre-filled | text | Unit stored in the master (mostly `kg`). |
| `variant_label` | Operations | text, optional | Only if the SKU has separately packed variants. Variants are not yet supported by the Buyer cart; leave blank unless a decision is recorded. |
| `packing_group_code` | Operations | lowercase `a-z0-9-` | Group of products that may be packed in the same tray/carton family (e.g. same moisture/size class). Assigned by Operations; the Buyer never infers it. |
| `inner_pack_type` | Operations | `tray` / `box` / other (name it) | What fills a carton slot. |
| `tray_internal_length_mm` | Operations | number, mm, > 0 | Measured internal length. |
| `tray_internal_width_mm` | Operations | number, mm, > 0 | Measured internal width. |
| `tray_internal_height_mm` | Operations | number, mm, > 0 | Measured internal height. |
| `tray_net_fill_weight_kg` | Operations | number, kg, > 0 | Net product weight in one filled tray/box. |
| `tray_orientation` | Operations | `flat` / `upright` / other | Orientation inside the carton. |
| `slots_per_ordered_unit` | Operations | positive **integer** | Carton slots one ordered unit occupies. If the SKU is ordered per tray this is 1. If it is ordered in kg this needs a conversion decision (see spec §4) and must stay blank until then. |
| `ordered_unit_proposed` | Operations (proposal) | `tray` / `box` / `kg` / `pack` / other | The unit Operations proposes for ordering. **A proposal only; the commercial unit is decided by the business owner and published by Core.** |
| `order_increment_proposed` | Operations (proposal) | number > 0 | Proposed step in that unit. Proposal only. |
| `moq_units_proposed` | Operations (proposal) | number > 0 | Proposed minimum. Proposal only; Finance/Core publish MOQ. |
| `permitted_carton_config_ids` | Operations | `\|`-separated ids from the carton catalogue (e.g. `888x4\|bulk-6`) | Carton configurations this SKU physically fits. Only the first three are defined today; new ones need a catalogue entry. |
| `slots_per_carton_by_config` | Operations | `config:number` pairs, `\|`-separated | Slots the carton offers for this SKU's packing group, e.g. `888x4:4`. |
| `mix_allowed` | Operations | `Y` / `N` | May this SKU share a carton with a different SKU at all. |
| `mix_compatible_packing_groups` | Operations | `\|`-separated group codes | Groups it may share a carton with. Empty with `mix_allowed=Y` is invalid. |
| `requires_separate_carton` | Operations | `Y` / `N` | Must never share a carton. |
| `full_carton_required` | Operations | `Y` / `N` | Carton must be completely filled before it can ship. |
| `retail_ready` | Operations | `Y` / `N` | Retail-ready packaging rules apply. |
| `contains_nuts` | Operations | `Y` / `N` | Allergen separation may apply. |
| `contains_dates` | Operations | `Y` / `N` | Moisture/odour separation may apply. |
| `gifting_item` | Operations | `Y` / `N` | Gifting rules apply. |
| `evidence_reference` | Operations | text | Document id, photo set, or measurement log. **Mandatory per filled row.** |
| `verified_by` | Operations | name | Person who verified. |
| `verified_on` | Operations | `YYYY-MM-DD` | Date of verification. |
| `notes` | anyone | text | Free text. |

## Row validity (applied before any import)

- `packing_group_code`, `inner_pack_type`, `slots_per_ordered_unit`, `permitted_carton_config_ids`, `slots_per_carton_by_config`, `mix_allowed`, `requires_separate_carton`, `full_carton_required`, `evidence_reference`, `verified_by`, `verified_on` must **all** be present, or the row is rejected whole.
- `requires_separate_carton = Y` forbids `mix_allowed = Y`.
- Every id in `slots_per_carton_by_config` must appear in `permitted_carton_config_ids`.
- `slots_per_ordered_unit` must be a whole number ≥ 1.
- Dimensions, when present, are positive numbers. The Buyer app never receives them; they are kept for Operations' audit.

## Import

Importing into Core is a governed Core change (see `CORE_PACKING_PROFILE_CONTRACT_SPEC.md` §9). Do not import through any shortcut.
