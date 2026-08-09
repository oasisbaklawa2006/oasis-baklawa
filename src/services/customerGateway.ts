import { callRpc } from "@/lib/rpc";
import type {
  BuyerProductPrice,
  CustomerOrderItem,
  CustomerOrderStatus,
  CustomerSupportTicket,
  PublishedProduct,
  SubmitSupportTicketInput,
} from "@/types/database.types";

export interface CatalogueProduct extends PublishedProduct {
  price?: BuyerProductPrice;
}

export const customerGateway = {
  products: () => callRpc<PublishedProduct[]>("published_products_v1"),
  prices: () => callRpc<BuyerProductPrice[]>("buyer_product_prices_v1"),
  orders: () => callRpc<CustomerOrderStatus[]>("customer_order_status_v1"),
  orderItems: () => callRpc<CustomerOrderItem[]>("customer_order_items_v1"),
  tickets: () => callRpc<CustomerSupportTicket[]>("customer_support_tickets_v1"),
  submitTicket: (input: SubmitSupportTicketInput) =>
    callRpc<string>("submit_customer_support_ticket_v1", {
      p_order_id: input.orderId,
      p_issue_type: input.issueType,
      p_description: input.description,
      p_product_sku: input.productSku ?? null,
      p_quantity_affected: input.quantityAffected ?? null,
    }),
  catalogue: async (): Promise<CatalogueProduct[]> => {
    const [products, prices] = await Promise.all([
      customerGateway.products(),
      customerGateway.prices(),
    ]);
    const priceByProduct = new Map(prices.map((p) => [p.product_id, p]));
    return products.map((p) => ({ ...p, price: priceByProduct.get(p.product_id) }));
  },
};
