import { supabase } from '@/lib/supabase';
import type {
  BuyerProductPrice,
  CustomerOrderItem,
  CustomerOrderStatus,
  CustomerSupportTicket,
  PublishedProduct,
} from '@/contracts/customerGateway';

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

export const customerGateway = {
  products: () => rpc<PublishedProduct[]>('published_products_v1'),
  prices: () => rpc<BuyerProductPrice[]>('buyer_product_prices_v1'),
  orders: () => rpc<CustomerOrderStatus[]>('customer_order_status_v1'),
  orderItems: () => rpc<CustomerOrderItem[]>('customer_order_items_v1'),
  tickets: () => rpc<CustomerSupportTicket[]>('customer_support_tickets_v1'),
  submitTicket: (input: { subject: string; message: string; orderId?: string | null }) =>
    rpc<CustomerSupportTicket[]>('submit_customer_support_ticket_v1', {
      p_subject: input.subject,
      p_message: input.message,
      p_order_id: input.orderId ?? null,
    }),
};
