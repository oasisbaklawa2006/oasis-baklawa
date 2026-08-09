# Oasis Baklawa B2B Buyer App

Mobile-first Expo / React Native application for approved wholesale buyers to browse governed catalogue pricing, build persistent order drafts, checkout, and track fulfilment.

## Data boundary

This app uses only governed Supabase RPC contracts. It must not query raw operational tables from the client.

See `scripts/verify-contract-boundary.mjs` and run `npm run verify:boundary`.

## Development

```bash
npm install
npm run quality
npm start
```

Set `EXPO_PUBLIC_SUPABASE_ANON_KEY` for authenticated sessions.

## Platform

- **Canonical:** Expo SDK 51 · React Navigation (stack + bottom tabs)
- **Not in scope:** Vite web storefront (historical branch only), Oasis Central (separate repository)
