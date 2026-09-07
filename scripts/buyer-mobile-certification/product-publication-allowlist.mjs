export const PUBLISHED_PRODUCT_FIELDS = new Set([
  "product_id",
  "sku",
  "product_name",
  "short_description",
  "long_description",
  "category",
  "subcategory",
  "hero_image_url",
  "pack_size",
  "storage_type",
  "shelf_life",
  "shelf_life_days",
  "lead_time_days",
  "dietary_tags",
  "allergen_warnings",
  "primary_uom",
  "created_at",
]);

export const BUYER_PRICE_FIELDS = new Set([
  "product_id",
  "selling_price",
  "currency",
  "uom",
  "gst_rate",
  "tax_inclusive",
  "applied_discount_percent",
  "minimum_order_quantity",
  "minimum_order_uom",
  "order_increment",
  "order_increment_uom",
  "valid_from",
  "valid_until",
]);

const RESTRICTED_PROJECTION_KEY = /^(internal_|cost_|margin|supplier|publication_state|is_published)/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function rowHasCustomerSafeKeysOnly(row, approvedFields) {
  if (!isPlainObject(row)) return false;
  for (const key of Object.keys(row)) {
    if (RESTRICTED_PROJECTION_KEY.test(key)) return false;
    if (!approvedFields.has(key)) return false;
  }
  return true;
}

export function allRowsHaveCustomerSafeKeysOnly(rows, approvedFields) {
  if (!Array.isArray(rows)) return false;
  return rows.every((row) => rowHasCustomerSafeKeysOnly(row, approvedFields));
}
