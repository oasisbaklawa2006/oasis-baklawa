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

`npm run verify:boundary` statically checks every source file and fails when raw protected tables or unapproved RPCs are introduced.

## Session behavior

Public visitors receive only published catalogue products. Buyer prices and order statuses are requested only after Supabase confirms an authenticated session; database contracts still enforce profile approval, active company ownership, and company isolation.

## Release verification

Run:

```bash
npm run quality
```

This executes the governed-boundary check, strict TypeScript validation, and a production Vite build.

## Vercel preview setup

Create a dedicated Vercel project for this repository rather than attaching it to either Central project.

Configure:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_SUPABASE_URL`
- Environment variable: `VITE_SUPABASE_ANON_KEY` using the publishable/anon key only

`vercel.json` provides SPA fallback routing and release security headers including CSP, clickjacking protection, content-type protection, referrer policy, and restrictive browser permissions.
