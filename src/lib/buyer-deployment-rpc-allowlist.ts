/** Buyer deployment RPC allowlist — canonical source for runtime payment-gateway gates.
 * Synced with production Core #255 cd078c52 gateway authority.
 */
export const BUYER_DEPLOYMENT_RPC_ALLOWLIST = [
  "published_products_v1",
  "buyer_product_prices_v1",
  "customer_order_status_v1",
  "customer_order_items_v1",
  "customer_support_tickets_v1",
  "submit_customer_support_ticket_v1",
  "customer_buyer_eligible_company_id",
  "customer_company_v1",
  "customer_team_v1",
  "get_customer_order_draft_v1",
  "add_customer_order_draft_line_v1",
  "update_customer_order_draft_line_v1",
  "remove_customer_order_draft_line_v1",
  "clear_customer_order_draft_v1",
  "submit_customer_order_v1",
  "calculate_customer_advance_v1",
  "submit_b2b_trade_application_v1",
  "customer_sales_order_commercial_facts_v1",
  "customer_order_finance_facts_v1",
  "customer_proforma_invoice_facts_v1",
  "customer_documents_v1",
  "customer_statement_v1",
  "customer_product_favourites_v1",
  "set_customer_product_favourite_v1",
  "customer_general_queries_v1",
  "submit_customer_general_query_v1",
  "customer_quotations_v1",
  "customer_quotation_detail_v1",
  "customer_quotation_lines_v1",
  "submit_customer_quotation_request_v1",
  "accept_customer_quotation_v1",
  "decline_customer_quotation_v1",
  "create_payment_gateway_payable_intent_v1",
  "get_payment_gateway_payable_status_v1",
  "get_sales_order_pi_final_payment_request_v1",
] as const;

export function getBuyerDeploymentRpcAllowlist(): readonly string[] {
  return BUYER_DEPLOYMENT_RPC_ALLOWLIST;
}
