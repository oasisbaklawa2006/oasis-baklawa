import { supabase } from '../lib/supabase';
import type {
  BuyerProductPrice,
  CustomerCatalogueItem,
  CustomerOrderStatus,
  PublishedProduct,
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
