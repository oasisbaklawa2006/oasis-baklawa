import { supabase } from '../lib/supabase';
import type {
  BuyerProductPrice,
  CustomerCatalogueItem,
  CustomerOrderItem,
  CustomerOrderStatus,
  CustomerSupportTicket,
  PublishedProduct,
  SubmitSupportTicketInput,
} from '../contracts/customerGateway';

function assertRpcSuccess<T>(
  result: { data: T | null; error: { message: string } | null },
  contractName: string,
): T {
  if (result.error) {
    throw new Error(`${contractName} failed: ${result.error.message}`);
  }

  return result.data ?? ([] as unknown as T);
}

export async function getPublishedProducts(): Promise<PublishedProduct[]> {
  const result = await supabase.rpc('published_products_v1');
  return assertRpcSuccess(result, 'published_products_v1') as PublishedProduct[];
}

export async function getBuyerProductPrices(): Promise<BuyerProductPrice[]> {
  const result = await supabase.rpc('buyer_product_prices_v1');
  return assertRpcSuccess(result, 'buyer_product_prices_v1') as BuyerProductPrice[];
}

export async function getCustomerOrderStatuses(): Promise<CustomerOrderStatus[]> {
  const result = await supabase.rpc('customer_order_status_v1');
  return assertRpcSuccess(result, 'customer_order_status_v1') as CustomerOrderStatus[];
}

export async function getCustomerOrderItems(): Promise<CustomerOrderItem[]> {
  const result = await supabase.rpc('customer_order_items_v1');
  return assertRpcSuccess(result, 'customer_order_items_v1') as CustomerOrderItem[];
}

export async function getCustomerSupportTickets(): Promise<CustomerSupportTicket[]> {
  const result = await supabase.rpc('customer_support_tickets_v1');
  return assertRpcSuccess(result, 'customer_support_tickets_v1') as CustomerSupportTicket[];
}

export async function submitCustomerSupportTicket(input: SubmitSupportTicketInput): Promise<string> {
  const result = await supabase.rpc('submit_customer_support_ticket_v1', {
    p_order_id: input.orderId,
    p_issue_type: input.issueType,
    p_description: input.description,
    p_product_sku: input.productSku ?? null,
    p_quantity_affected: input.quantityAffected ?? null,
  });

  if (result.error) {
    throw new Error(`submit_customer_support_ticket_v1 failed: ${result.error.message}`);
  }

  if (typeof result.data !== 'string') {
    throw new Error('submit_customer_support_ticket_v1 returned an invalid ticket identifier');
  }

  return result.data;
}

export async function getCustomerCatalogue(): Promise<CustomerCatalogueItem[]> {
  const [products, prices] = await Promise.all([
    getPublishedProducts(),
    getBuyerProductPrices(),
  ]);

  const pricesByProduct = new Map(prices.map((price) => [price.product_id, price]));

  return products.map((product) => ({
    ...product,
    buyer_price: pricesByProduct.get(product.product_id) ?? null,
  }));
}
