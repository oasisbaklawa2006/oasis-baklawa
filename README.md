# Oasis Baklawa Customer App

Customer-facing web application for published catalogue browsing, authenticated buyer pricing, and customer-owned order tracking.

## Data boundary

This app must use only the governed Supabase RPC contracts:

- `published_products_v1()`
- `buyer_product_prices_v1()`
- `customer_order_status_v1()`

It must not query raw `products`, `product_pricing_rules`, `orders`, `profiles`, `companies`, or operational logistics tables from the browser.
