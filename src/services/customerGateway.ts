import { callRpc } from "@/lib/rpc";
import {
  canonicalSupportIssueType,
  normalizeCustomerFinanceFacts,
  normalizeCustomerGeneralQuery,
  normalizeCustomerStatement,
} from "@/lib/customer-projections";
import type {
  BuyerProductPrice,
  CustomerCommercialFacts,
  CustomerDocument,
  CustomerFinanceFacts,
  CustomerGeneralQuery,
  CustomerOrderStatus,
  CustomerProformaInvoiceFacts,
  CustomerProductFavourite,
  CustomerStatement,
  CustomerSupportTicket,
  PublishedProduct,
  SubmitCustomerGeneralQueryInput,
  SubmitCustomerGeneralQueryResult,
  SubmitSupportTicketInput,
} from "@/types/database.types";

export interface CatalogueProduct extends PublishedProduct {
  price?: BuyerProductPrice;
}

export const customerGateway = {
  products: () => callRpc("published_products_v1"),
  prices: () => callRpc("buyer_product_prices_v1"),
  orders: () => callRpc("customer_order_status_v1"),
  orderItems: () => callRpc("customer_order_items_v1"),
  commercialFacts: (): Promise<CustomerCommercialFacts[]> => callRpc("customer_sales_order_commercial_facts_v1"),
  financeFacts: async (orderId: string): Promise<CustomerFinanceFacts | null> =>
    normalizeCustomerFinanceFacts(await callRpc("customer_order_finance_facts_v1", { p_order_id: orderId })),
  proformaInvoices: (): Promise<CustomerProformaInvoiceFacts[]> => callRpc("customer_proforma_invoice_facts_v1"),
  documents: (): Promise<CustomerDocument[]> => callRpc("customer_documents_v1"),
  statement: async (): Promise<CustomerStatement | null> =>
    normalizeCustomerStatement(await callRpc("customer_statement_v1")),
  favourites: (): Promise<CustomerProductFavourite[]> => callRpc("customer_product_favourites_v1"),
  setFavourite: (productId: string, isFavourite: boolean) =>
    callRpc("set_customer_product_favourite_v1", { p_product_id: productId, p_is_favourite: isFavourite }),
  tickets: () => callRpc("customer_support_tickets_v1"),
  generalQueries: async (): Promise<CustomerGeneralQuery[]> => {
    const rows = await callRpc("customer_general_queries_v1");
    return (rows ?? [])
      .map(normalizeCustomerGeneralQuery)
      .filter((query): query is CustomerGeneralQuery => Boolean(query));
  },
  submitTicket: (input: SubmitSupportTicketInput) => {
    if (!input.orderId.trim()) {
      return Promise.reject(new Error("Select an order before submitting order support."));
    }
    return callRpc("submit_customer_support_ticket_v1", {
      p_order_id: input.orderId,
      p_issue_type: canonicalSupportIssueType(input.issueType),
      p_description: input.description,
      p_product_sku: input.productSku ?? null,
      p_quantity_affected: input.quantityAffected ?? null,
    });
  },
  submitGeneralQuery: async (input: SubmitCustomerGeneralQueryInput): Promise<SubmitCustomerGeneralQueryResult> => {
    const data = await callRpc("submit_customer_general_query_v1", {
      p_idempotency_key: input.idempotencyKey,
      p_subject: input.subject,
      p_message: input.message,
      p_category: input.category,
    });
    const result = data?.[0];
    if (!result) {
      throw new Error("General enquiry did not return a result. Please try again.");
    }
    return result;
  },
  catalogue: async (): Promise<CatalogueProduct[]> => {
    const [products, prices] = await Promise.all([customerGateway.products(), customerGateway.prices()]);
    const priceByProduct = new Map(prices.map((p) => [p.product_id, p]));
    return products.map((p) => ({ ...p, price: priceByProduct.get(p.product_id) }));
  },
};

export type {
  CustomerCommercialFacts,
  CustomerDocument,
  CustomerFinanceFacts,
  CustomerGeneralQuery,
  CustomerOrderStatus,
  CustomerProformaInvoiceFacts,
  CustomerStatement,
  CustomerSupportTicket,
};
