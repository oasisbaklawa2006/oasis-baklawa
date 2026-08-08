# Oasis Baklawa Customer App

Customer-facing application for published catalogue browsing, authenticated buyer pricing, persistent order drafts, checkout, and customer-owned order tracking.

## Data boundary

This app uses only governed Supabase RPC contracts:

- `published_products_v1()`
- `buyer_product_prices_v1()`
- `customer_buyer_eligible_company_id()`
- `customer_company_v1()`
- `customer_team_v1()`
- `get_customer_order_draft_v1()`
- `add_customer_order_draft_line_v1(...)`
- `update_customer_order_draft_line_v1(...)`
- `remove_customer_order_draft_line_v1(...)`
- `clear_customer_order_draft_v1()`
- `submit_customer_order_v1(...)`
- `calculate_customer_advance_v1(...)`
- `submit_b2b_trade_application_v1(...)`
- `customer_order_status_v1()`
- `customer_order_items_v1()`
- `customer_support_tickets_v1()`

It must not query raw `products`, `product_pricing_rules`, `orders`, `profiles`, `companies`, or operational logistics tables from the client.
