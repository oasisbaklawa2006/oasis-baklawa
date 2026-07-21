# Oasis Baklawa Customer App

Customer-facing web application for published catalogue browsing, authenticated buyer pricing, and customer-owned order tracking.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and the Supabase publishable/anon key.
3. Run `npm install`.
4. Run `npm run dev`.

Never place a service-role key in this repository or any `VITE_*` variable.

## Governed data boundary

The browser must use only these Supabase RPC contracts:

- `published_products_v1()` for the public catalogue
- `buyer_product_prices_v1()` for approved authenticated buyer pricing
- `customer_order_status_v1()` for company-owned order tracking

The browser must not query raw `products`, `product_pricing_rules`, `orders`, `profiles`, `companies`, payments, dispatch, audit, WhatsApp, or operational logistics tables.

## Session behavior

Public visitors receive only published catalogue products. Buyer prices and order statuses are requested only after Supabase confirms an authenticated session; database contracts still enforce profile approval, active company ownership, and company isolation.
