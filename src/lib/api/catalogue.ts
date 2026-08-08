import { supabase } from "@/lib/supabase";
import type { BuyerProductPrice, PublishedProduct } from "@/types/database.types";

export interface CatalogueProduct extends PublishedProduct {
  price?: BuyerProductPrice;
}

export async function fetchPublishedProducts(): Promise<PublishedProduct[]> {
  const { data, error } = await supabase.rpc("published_products_v1");
  if (error) throw error;
  return (data as PublishedProduct[] | null) ?? [];
}

export async function fetchBuyerProductPrices(): Promise<BuyerProductPrice[]> {
  const { data, error } = await supabase.rpc("buyer_product_prices_v1");
  if (error) throw error;
  return (data as BuyerProductPrice[] | null) ?? [];
}

export async function fetchCatalogue(): Promise<CatalogueProduct[]> {
  const [products, prices] = await Promise.all([fetchPublishedProducts(), fetchBuyerProductPrices()]);
  const priceByProduct = new Map(prices.map((price) => [price.product_id, price]));
  return products.map((product) => ({ ...product, price: priceByProduct.get(product.product_id) }));
}
