export interface PublishedProduct {
  product_id: string;
  sku: string;
  product_name: string;
  short_description: string | null;
  long_description: string | null;
  category: string | null;
  subcategory: string | null;
  hero_image_url: string;
  pack_size: string | null;
  storage_type: string | null;
  shelf_life: string | null;
  shelf_life_days: number | null;
  dietary_tags: string[] | null;
  allergen_warnings: string | null;
  primary_uom: string | null;
  created_at: string;
}

export interface BuyerProductPrice {
  product_id: string;
  sku: string;
  product_name: string;
  selling_price: number;
  currency: string;
  uom: string | null;
  gst_rate: number | null;
  tax_inclusive: boolean;
  applied_discount_percentage: number;
  valid_from: string | null;
  valid_until: string | null;
}

export interface CustomerOrderStatus {
  order_id: string;
  order_number: string;
  customer_stage: string;
  payment_stage: string;
  order_value: number | null;
  total_weight_kg: number | null;
  requested_dispatch_date: string | null;
  promised_dispatch_date: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  created_at: string;
}

export interface CustomerCatalogueItem extends PublishedProduct {
  buyer_price: BuyerProductPrice | null;
}
