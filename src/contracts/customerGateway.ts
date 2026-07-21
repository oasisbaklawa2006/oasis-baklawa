export type PublishedProduct = {
  product_id: string;
  sku: string | null;
  product_name: string;
  category: string | null;
  description: string | null;
  hero_image_url: string | null;
};

export type BuyerProductPrice = {
  product_id: string;
  currency: string;
  unit_price: number;
  minimum_order_quantity: number;
  minimum_order_uom: string;
  order_increment: number;
  order_increment_uom: string;
};

export type CustomerOrderStatus = {
  order_id: string;
  order_number: string | null;
  order_status: string;
  order_date: string | null;
  packed_quantity: number | null;
};

export type CustomerOrderItem = {
  order_id: string;
  order_item_id: string;
  product_name: string;
  ordered_quantity: number;
  packed_quantity: number | null;
  uom: string | null;
};

export type CustomerSupportTicket = {
  ticket_id: string;
  ticket_number: string | null;
  subject: string;
  status: string;
  created_at: string;
  order_id: string | null;
};
