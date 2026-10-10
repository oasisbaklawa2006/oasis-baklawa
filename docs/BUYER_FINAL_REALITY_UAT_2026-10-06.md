# Oasis Baklawa Buyer App — Final Screen Reality Audit & Physical UAT Contract

Date: 2026-10-06  
Repository: `oasisbaklawa2006/oasis-baklawa`  
Baseline entering the original certification batch: `fe70a51cb2bde599c3bce90b6aa56e26b5f12000`  
Runtime-reality reconciliation checkpoint: Buyer `main` `e0523172dc531da24eef79871790b5f26389bbbd` after PR #57.  
Final-device builds MUST use the latest merged `main` SHA after Core #399 production activation and post-release verification.

## 1. Executive result

After Buyer convergence PRs #38–#49, the Buyer app has **no customer-visible placeholder screen** remaining.

For this audit:

- **REAL** = the screen is operational and is driven by live governed backend data, authoritative session state, or intentional static product/policy content.
- **REAL — governed fallback** = the screen is operational but the specific master-data projection does not yet exist; the user can submit and track a governed request instead of seeing a dead end or invented data.
- **FEATURE-GATED** = the route/source exists but is intentionally hidden/disabled because its production authority is not deployed. This is not a customer-visible placeholder.
- **PLACEHOLDER** = dead screen, fake data, “coming soon”, or unavailable-only surface with no real action. **Count after this batch: 0.**

## 2. Every Buyer surface — reality table

| Surface | Classification | Live authority / behaviour |
|---|---|---|
| Splash | REAL | Supabase session + buyer session resolution; failures route to Session Recovery. |
| Onboarding | REAL | Intentional first-run static onboarding. |
| Welcome | REAL | Real navigation into login or B2B access request. |
| Login | REAL | Buyer preflight -> MSG91 OTP -> governed session bridge -> authoritative buyer routing. Requires dedicated mobile MSG91 build config. |
| Register / Request B2B Access | REAL | `submit_b2b_access_request_v2`; logged-out request flow with duplicate/status handling. |
| Access Pending | REAL | Authoritative preflight outcome; no OTP/commerce authority. |
| Access Rejected | REAL | Authoritative preflight outcome; no OTP/commerce authority. |
| Session Recovery | REAL | Retries buyer-session resolution without stacking recovery screens. |
| MainTabs | REAL | Five-tab navigation container. |
| Dashboard | REAL | Live orders, finance facts, company context and recently-added published products. No invented announcements. |
| Catalogue | REAL | Published products + approved-buyer pricing + live commercial validation. |
| Orders | REAL | Customer order status projection and post-submit result handling. |
| Support | REAL | Live tickets, general enquiries, order-linked support and communication history. |
| Account | REAL | Customer company + team data and real navigation to account services. |
| Product Detail | REAL | Published product, buyer price, commercial rules, favourites, cart/quotation actions. |
| Favourites | REAL | Server-authoritative favourites + published catalogue. |
| Catalogue Filters | REAL | Operational client filtering over governed catalogue fields. |
| Collection Hub | REAL | Navigation hub to actual collection surfaces. |
| Seasonal Collection | REAL | Derived only from explicit published catalogue taxonomy; no guessed seasonal claims. |
| Private Label | REAL | Live `customer_private_label_products_v1` projection when governed published offers exist, plus auditable enquiry/request history. Missing owner commercial data is never invented. |
| Packaging & Decoration | REAL | Live `customer_packaging_offers_v1` projection when governed published offers exist, plus auditable packaging/decoration enquiry/request history. Missing owner commercial data is never invented. |
| Recommended | REAL | Buyer-specific published products derived from favourites and prior order items only. |
| Order Detail | REAL | Order status/timeline + finance/document/payment/support actions from governed projections. |
| Quick Order | REAL | Published catalogue search + current buyer commercial rules + live draft mutations. |
| Oasis Genie / AI Order | FEATURE-GATED | Production `ai-order-parse` is deployed and JWT-protected, but Buyer remains deliberately hidden/fail-closed because `EXPO_PUBLIC_GENIE_PARSE_ENABLED` is absent/false. |
| Cart | REAL | Server draft + published commercial rules and quantity validation. |
| Commercial Review | REAL | Real review of unresolved commercial/quantity conditions before checkout. |
| Checkout | REAL | Server draft, advance calculation, persisted idempotency and `submit_customer_order_v1`. |
| Order Confirmation | REAL | Server order + finance facts with next payable action. |
| Documents | REAL | Customer documents, PI facts and statement projection; truthful not-issued/upstream states. |
| Statement | REAL | `customer_statement_v1`; truthful empty state when no issued statement facts exist. |
| Quotations | REAL | Governed quotation summaries. |
| Quotation Detail | REAL | Governed lines/detail + idempotent accept/decline + handoff truth. |
| Order Payment | REAL | Server finance facts + production-bound payment intent/status RPCs. |
| Payment Result | REAL | Shows only verified success/failure outcome returned by governed payment status. |
| Delivered Closure | REAL | Delivered-state verification + complaint/commercial closure facts + reorder/support/documents. |
| Reorder | REAL | Previous order items revalidated against today’s published catalogue and commercial rules. |
| Communication Log | REAL | Support tickets + general enquiries with partial-source outage tolerance. |
| Employees | REAL | `customer_team_v1`; truthful empty roster. |
| Addresses | REAL — governed fallback | Registered address from `customer_company_v1` + auditable address-change/addition request history. |
| Preferred Transporter | REAL — governed fallback | Auditable transporter preference/update request history. |
| Settings | REAL | Navigation to live help/policy surfaces. |
| FAQ & Contact | REAL | Intentional static help/contact content with external-link actions. |
| Shipping Policy | REAL | Intentional static policy content. |
| Terms & Privacy | REAL | Intentional static legal/policy content. |

## 3. Remaining activation / owner-data gaps

Production reality was rechecked on 2026-10-06 after Core #398 and Buyer PRs #56/#57:

- `customer_private_label_products_v1`, `customer_packaging_offers_v1`, and `connect_staff_readiness_v1` are live.
- `ai-order-parse` is live, ACTIVE and JWT-protected; Buyer Genie remains intentionally OFF.
- Core #399 migration `20261006032935_buyer_fullfeel_runtime_train.sql` is **not** yet in the production migration ledger.
- The #399 saved-address/saved-transporter/payment-provider helper objects and generic payment Edge Functions are still absent pending the protected #399 release.

| Gap | What is missing | Current safe behaviour | Completion authority |
|---|---|---|---|
| Multi-address book | #399 customer address write/delete authority | Registered company address remains visible; additions/changes can still become auditable ACCOUNT requests | **Core #399 protected production release.** |
| Saved transporters | #399 multi-saved transporter projection/write authority | Buyer retains governed DELIVERY request fallback until Core authority is live | **Core #399 protected production release.** |
| Private-label commercial readiness | Projection is live, but current published private-label data still needs explicit owner selling price/lead-time completion | Published governed facts render; missing commercial facts remain unclaimed and enquiry path stays available | **Owner/catalogue data decision in Studio.** |
| Packaging commercial readiness | Projection is live, but there are currently no fully governed published packaging offers | Buyer shows only governed published offers and keeps request fallback available | **Owner/catalogue publication, pricing and lead-time decisions in Studio.** |
| Generic payment runtime | #399 provider config helpers + `payment-provider-create-session` / `payment-provider-webhook`; no provider row or merchant endpoint is invented | Payment remains fail-closed; success still requires signed server event + canonical settlement | **Core #399 release, then deliberate engineering/provider configuration.** |
| Oasis Genie customer activation | Buyer feature flag remains OFF by design | `ai-order-parse` is live but no customer-facing Genie route/invocation is exposed | **Separate deliberate Phase-2 product activation, not a backend deployment gap.** |
| Native OTP deployment config | Dedicated MSG91 Mobile Integration widget ID/token and Supabase public key in selected EAS environment | Build validation fails closed if missing or if Central web widget is reused | **Configuration task, not missing frontend code.** |

Authentication scope is locked to **phone OTP (MSG91) + email OTP only**. Social sign-in is intentionally out of scope and must not be added to Buyer UI, native dependencies, auth configuration or activation planning.

## 4. Build entry gate for physical UAT

Before generating either device build:

1. Checkout latest merged `main`; record exact full SHA. Do not build from an open PR.
2. Run `npm ci` (or repository-approved install command) and `npm run quality`; must pass.
3. Require all **configured, applicable exact-head GitHub checks** to pass (currently Buyer Quality Gate and Core Backend Authority). Verify actual check-run and branch-protection evidence on the selected build SHA; include any additional checks only when they are installed and report for that ref. Review substantive CodeRabbit/security findings when available, but do not treat missing or rate-limited third-party contexts as a green result or invent a required context. Never bypass a required branch-protection gate.
4. Use the merged manual workflow `.github/workflows/android-uat-eas-build.yml` with the exact current Buyer `main` SHA. It re-runs `npm run quality`, verifies package/project ownership, uses EAS `preview` internal distribution, and records only sanitized build evidence.
5. Use EAS `preview` / internal-distribution environment for physical UAT unless production release is explicitly intended.
6. Required EAS environment values must be present without printing them:
   - `EXPO_PUBLIC_MSG91_WIDGET_ID` — dedicated Buyer **Mobile Integration** widget, never Central web widget.
   - `EXPO_PUBLIC_MSG91_TOKEN_AUTH`.
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
7. Keep `EXPO_PUBLIC_GENIE_PARSE_ENABLED` absent/false. The backend parser is deployed, but Genie customer activation remains a separate deliberate Phase-2 decision.
8. Generate a **new Android APK** from the exact post-Core-activation Buyer `main` SHA. iOS remains a separate physical-UAT/provisioning lane.
9. Do **not** use the old Android APK at `6588d85e` or the September RC build at `2da7bb7`; both predate the current merged Buyer/runtime convergence work.

## 5. Test evidence to record for every device

Record: platform, device model, OS version, app build ID/install URL, Git SHA, tester, timestamp, test account class, screenshot for failures, and backend order/quotation/payment identifiers for mutations. Never record OTPs, secrets, provider tokens or access tokens.

## 6. Physical Android + iPhone UAT — exact execution order

Run the same functional matrix on **Android first**, then repeat on **iPhone**. A pass on one platform does not certify the other.

### A. Install, cold start and lifecycle

- Fresh install -> icon/name correct -> app launches without crash.
- First run -> Onboarding -> Welcome.
- Force quit/reopen logged out -> deterministic Welcome/Onboarding state.
- Log in approved buyer -> force quit/reopen -> Dashboard, no login loop.
- Background 2–5 minutes -> foreground -> session remains coherent.
- Disable network before cold start with an existing session -> Session Recovery, not infinite Splash.
- Restore network -> Try again -> correct route.
- Tap Try again rapidly -> only one effective recovery attempt.

### B. Access-state matrix

Test separate identities/states:

- Unknown/no application -> preflight routes to Request B2B Access; OTP is not sent.
- New application -> submit once; rapid double-tap does not create two applications.
- Pending -> Access Pending; no commerce tabs/OTP.
- Rejected -> Access Rejected; no commerce tabs/OTP.
- Approved buyer by mobile -> OTP send, six-digit entry, verify, Dashboard.
- Approved buyer by email -> OTP send, verify, Dashboard.
- OTP wrong/expired/resend -> controlled error/retry; no duplicate session claim.
- Sign out -> Welcome; protected surfaces no longer expose buyer data.

Social login is intentionally out of scope. Buyer authentication is phone OTP (MSG91) + email OTP only.

### C. Catalogue and discovery

- Catalogue loads published products and approved-buyer pricing.
- Search by product/SKU; clear search.
- Filters: category/subcategory/ingredients/price as available; reset filters.
- Open Product Detail; verify image/name/pack/commercial fields.
- MOQ/carton/increment rules reject invalid quantity and allow valid quantity.
- Favourite/unfavourite -> Favourites updates after reload.
- Seasonal Collection shows only explicitly classified published products or truthful empty state.
- Recommended shows products only after favourite/order-history signal or truthful empty state.
- Collection Hub routes to Seasonal, Private Label, Packaging, Recommended.
- Private Label -> submit enquiry -> history appears; rapid repeat does not duplicate.
- Packaging -> submit enquiry -> history appears; rapid repeat does not duplicate.

### D. Account services

- Account shows company + team facts.
- Employees shows live team or truthful empty roster.
- Addresses shows registered address; submit address change/addition request; history appears.
- Preferred Transporter -> submit preference/instruction; history appears.
- Settings -> FAQ/Contact, Shipping Policy, Terms/Privacy all open.
- External contact links either open or provide controlled fallback.

### E. Quick order, cart and checkout

- Quick Order search -> valid line -> Cart.
- Product Detail add-to-cart -> Cart.
- Cart shows server draft and current pricing; edit/remove/clear behave correctly.
- Invalid MOQ/carton quantity fails closed with understandable message.
- Checkout loads order value + server-calculated advance.
- Offline at checkout -> submit disabled.
- Reconnect -> facts reload; submit re-enables only when valid.
- Tap Confirm/Submit rapidly twice -> exactly one Sales Order.
- Background/foreground during submit -> no duplicate SO.
- Record returned `order_id`, order number, order value and advance.

### F. Order journey

- Order appears in Orders after refresh.
- Open Order Detail; list stage and detail stage agree.
- Validate Golden Pipeline progression labels for the current backend stage.
- Order Confirmation loads server order/finance facts.
- Communication Log shows relevant support/general-query history.
- Reorder checks previous lines against current catalogue; unavailable/changed lines are clearly blocked.
- Delivered Closure is accessible only for delivered orders.

### G. Quotations

- Request quotation from supported product flow.
- Quotation appears in Quotations.
- Detail totals/lines/version/expiry match backend facts.
- Accept -> one handoff only; action buttons disable immediately after confirmed success.
- Decline -> one decline only; action buttons disable immediately after confirmed success.
- Rapid taps cannot issue duplicate accept/decline.
- If post-action refresh is interrupted, success remains success and only refresh warning appears.
- Stale-version response triggers refresh instead of acting on old version.

### H. Documents and statement

- Documents lists Order Confirmation, PI and Final Invoice states truthfully.
- Missing/unissued document shows not-issued/upstream state, never fake document data.
- Statement opens when `statement_facts_only` is available.
- Account with no statement facts gets truthful empty state.
- Wallet/invoice/due amounts match server projection.

### I. Payments

Use only a test order with a server-authoritative payable amount.

- Order Detail/Dashboard payment CTA opens Order Payment.
- Order total, advance, covered amount, balance, PI number and Pay Now amount match finance facts.
- Offline -> payment initiation disabled.
- Initiate once -> one governed payment intent; rapid tap does not duplicate.
- Record intent ID/provider order reference where shown.
- Pending gateway state -> Check payment status does not claim success.
- Verified success -> Payment Result “Payment received”; order/finance facts refresh.
- Verified terminal failure -> Payment Result “Payment needs attention”; retry is available.
- No PI/commercial binding -> initiation remains blocked with truthful reason.
- No payable balance -> initiation remains blocked.
- Never pass a payment solely because a local UI button was tapped; backend verified status is required.

### J. Support and communications

- Submit order-linked support ticket.
- Rapid double-tap -> one effective ticket.
- Submit general enquiry.
- Rapid double-tap -> one effective enquiry.
- Simulate refresh failure after successful submit if practicable -> success remains visible with refresh warning, not a false submission failure.
- Communication log shows newest real entries.
- Partial-source failure shows available history plus warning rather than discarding all history.

### K. Network and recovery

At minimum test airplane mode on Catalogue, Orders, Checkout, Support, Documents and Payment.

- Existing data is not silently replaced with fake data.
- Mutation buttons fail closed while unsafe/offline.
- Retry restores data.
- Session Recovery never stacks duplicate screens.
- Cold-start auth/backend exception never leaves infinite Splash.

### L. Accessibility and device UX

On both Android TalkBack and iPhone VoiceOver:

- Splash/loading announced.
- Login method buttons, inputs, OTP field and resend state are understandable.
- Five bottom tabs have meaningful labels and selected state.
- Product cards, favourite/remove, cart quantity actions and checkout submit are reachable.
- Alerts/errors use accessible roles/live regions where implemented.
- Payment/quotation/support action buttons announce disabled/busy states.
- Text does not clip at increased system font size.
- Portrait safe areas are correct; rotate once where supported.
- Keyboard does not permanently cover the active input or submit action.

### M. iPhone-specific

- Apple Developer team/provisioning must permit the exact device or TestFlight/internal path used.
- Bundle ID must be `com.oasisbaklawa.customer`.
- Cold start, OTP autofill, deep links and external contact links must be repeated on iOS.
- VoiceOver smoke is mandatory.
- If internal distribution is used, record provisioning/device registration evidence.

### N. Android-specific

- Package must be `com.oasisbaklawa.customer`.
- Install/update behaviour tested from a clean install and one upgrade over the immediately previous internal build if available.
- Back gesture/button must not escape protected flows into stale buyer data.
- TalkBack smoke is mandatory.
- Record APK EAS build ID and SHA.

## 7. Final device sign-off

The Buyer app is physical-UAT PASS only when:

- Android matrix passes on a build from current merged main.
- iPhone matrix passes on a build from the same current merged main.
- No P0/P1 defect remains.
- Any P2/P3 is recorded with owner/decision.
- Order duplicate-submit, quotation duplicate-action, support duplicate-submit, offline checkout, session recovery and payment verification tests all pass.
- The tested SHA/build IDs are recorded.

Suggested sign-off record:

```
OASIS BAKLAWA BUYER — PHYSICAL UAT SIGN-OFF
Git SHA:
Android EAS build ID:
Android device / OS:
Android result: PASS / FAIL
iOS EAS build ID:
iPhone device / iOS:
iOS result: PASS / FAIL
Access-state matrix: PASS / FAIL
Catalogue/discovery: PASS / FAIL
Cart/checkout/SO idempotency: PASS / FAIL
Orders/reorder/delivery closure: PASS / FAIL
Quotations/idempotency: PASS / FAIL
Documents/statement: PASS / FAIL
Payments/backend verification: PASS / FAIL
Support/general enquiries/idempotency: PASS / FAIL
Offline/session recovery: PASS / FAIL
Accessibility: PASS / FAIL
Open P0:
Open P1:
Open P2/P3:
Tester:
Date:
```

## 8. Release interpretation

Software completion and physical certification are separate.

The current Buyer code can be software-complete while the following remain external/deferred:

- dedicated mobile MSG91 environment values before a physical build;
- Apple provisioning/device distribution for iPhone;
- Oasis Genie customer activation, which remains deliberately OFF even though `ai-order-parse` is already live;
- #399 address/transporter write authority until the protected production migration release completes;
- owner-data completion for private-label and packaging commercial readiness, which must be supplied through governed catalogue authority rather than invented in Buyer.

Do not reopen already-certified Buyer screens merely because these external or future-authority items exist.
