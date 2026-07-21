# Customer App Deployment

This repository must be deployed through its own Vercel project. Do not attach it to either Central project.

## Vercel project

- Repository: `oasisbaklawa2006/oasis-baklawa`
- Framework preset: Vite
- Root directory: repository root
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Required environment variables

Configure these for Preview and Production:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Only the Supabase project URL and publishable/anon key are allowed. Never add a service-role key to Vercel.

## Release checks

Before production promotion, confirm:

1. GitHub Quality passes.
2. The preview deployment renders the public catalogue.
3. Anonymous users cannot see buyer prices, orders or support tickets.
4. Approved buyers can sign in and see only their own company data.
5. Support ticket submission uses `submit_customer_support_ticket_v1`.
6. Browser source contains no service-role credential.
7. SPA route refreshes resolve through `vercel.json` rewrites.
