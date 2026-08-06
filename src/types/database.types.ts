// Manually derived from oasis-supabase-core governed RPC contracts
// (published_products_v1, buyer_product_prices_v1, customer_order_status_v1)
// since `supabase gen types` requires an authenticated CLI session that is
// unavailable in this environment. Regenerate with:
//   npx supabase gen types typescript --project-ref tcxvcatsqqertcnycuop
// once CLI auth is available, and replace this file.

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      published_products_v1: {
        Args: Record<string, never>;
        Returns: PublishedProduct[];
      };
      buyer_product_prices_v1: {
        Args: Record<string, never>;
        Returns: BuyerProductPrice[];
      };
      customer_order_status_v1: {
        Args: Record<string, never>;
        Returns: CustomerOrderStatus[];
      };
    };
  };
}

export interface PublishedProduct {
  product_id: string;
  sku: string;
  product_name: string;
  short_description: string | null;
  long_description: string | null;
  category: string | null;
  subcategory: string | null;
  hero_image_url: string | null;
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
  selling_price: number;
  currency: string;
  uom: string;
  gst_rate: number;
  tax_inclusive: boolean;
  applied_discount_percent: number | null;
  minimum_order_quantity: number | null;
  minimum_order_uom: string | null;
  order_increment: number | null;
  order_increment_uom: string | null;
  valid_from: string | null;
  valid_until: string | null;
}

export interface CustomerOrderStatus {
  order_id: string;
  order_number: string;
  customer_stage: string;
  payment_stage: string;
  order_value: number;
  total_weight_kg: number | null;
  requested_dispatch_date: string | null;
  promised_dispatch_date: string | null;
  tracking_number: string | null;
  courier_name: string | null;
  created_at: string;
  updated_at: string;
}
