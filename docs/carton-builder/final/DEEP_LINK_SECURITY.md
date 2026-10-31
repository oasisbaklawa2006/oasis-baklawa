# Deep-link reachability of the React Navigation advisory chain (31 Oct 2026)

**Finding (reproduced):** the app registers `oasisbaklawa://` deep links (`RootNavigator.tsx`) and passes every incoming URL to React Navigation's `getStateFromPath`, which parses the query string with `query-string` → `decode-uri-component` (advisory: quadratic/exponential time on crafted percent-encoded input). Measured with the app's real route table on this machine:
| Input | Result |
|---|---|
| matching route `order/abc?q=` + 200×`%AA` (612 chars) | 657 ms |
| unmatched route, same query | 0 ms (parser not reached) |
| `home?q=` + n×`%AA`, 307 / 607 / 1,207 / 2,407 chars | 166 ms / 704 ms / 3.1 s / 13.3 s (roughly quadratic) |
| `%E0%A4%A` repeated, 64 k / 128 k chars | 247 ms / 425 ms |
A link of a few kilobytes aimed at a real route can freeze the JS thread for many seconds; larger ones effectively hang the app. Any app or web page that can open `oasisbaklawa://order/<id>?q=…` (or a crafted web URL) can trigger it; no authentication or data access is involved, so the impact is **availability only**.

**Repair applied (in scope, no dependency change):** `src/navigation/deep-link-guard.ts` rejects links longer than 512 characters, with more than 24 percent escapes, or with malformed escapes before they reach the parser; `RootNavigator` wraps `getStateFromPath` with it. Tests prove real link shapes still parse and attack strings (40 k–100 k characters) are rejected in under 50 ms. **Residual:** the vulnerable library remains installed; within the guard's caps a link can still cost up to a few hundred milliseconds, and any other code path that calls `query-string` on untrusted input is not covered (none found in the app source). Removing the vulnerability needs React Navigation 7 (separate migration).
