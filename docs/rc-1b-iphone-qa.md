# RC-1B — iPhone qualification & owner device QA

Canonical RC branch: `cursor/buyer-app-completion-72ab` (PR #5)  
Immutable software SHA: `2da7bb76f7841e59394df0f1b968c0ac3f2328c1`  
EAS project: `369e4480-3bbf-49cd-8a10-5bac5f8290a1`  
Preview environment only — **do not use production profile or production env vars.**

## Preview artifacts (generate / verify at this SHA)

| Platform | Build ID | Install artifact | Notes |
|----------|----------|------------------|-------|
| Android | `5518b7d5-8dfb-49a2-a857-7952cc715107` | https://expo.dev/artifacts/eas/3Qsj4RKMXJlVOV_SS0iuh-p5ARbKO5W4D9TnSdq8rBw.apk | FINISHED @ `2da7bb7` |
| Android | `f49a72d7-0983-48f7-8344-6e3398cc99e3` | *(poll build page)* | Fresh RC continuation build @ `2da7bb7` |
| iOS | — | — | **Blocked** until Apple Developer team is linked to Expo and internal-distribution credentials exist |

**Android poll:** `npx eas-cli build:view f49a72d7-0983-48f7-8344-6e3398cc99e3`  
**iOS unblock (owner, interactive):** `npx eas-cli credentials -p ios` then `npx eas-cli build --platform ios --profile preview`

Software gate (local + CI): `npm run quality` — 32 tests, boundary, navigation, forensic, typecheck, lint, Expo public config.

---

## RC-1B iPhone test sequence (exact order)

Use an **approved wholesale buyer** test account on preview Supabase. Record timestamps, screenshots, and backend `order_id` / `order_number` for every submit.

### 0 — Install & cold start

1. Install the **iOS preview** build from EAS internal distribution (after iOS artifact exists) on the owner iPhone.
2. Confirm bundle ID `com.oasisbaklawa.customer` and app name **Oasis Baklawa**.
3. Force-quit, relaunch → **Splash** → session resolves without crash.
4. Note cold-start route (approved buyer → **Dashboard** tab).

### 1 — Access-control matrix

Run each row with a **fresh app install** or full sign-out + clear session.

| Actor | Steps | Pass criteria |
|-------|--------|---------------|
| **Anonymous** | Do not log in. Open **Catalogue**, **Cart**, **Checkout** (deep link or cart flow). | `BuyerGate` blocks ordering; login/register CTAs; no governed buyer prices on catalogue (approved-only RPC gated). |
| **Unapproved (pending)** | Log in as pending applicant. | **AccessPending**; no **MainTabs** commerce; support link opens (Alert fallback if URL fails). |
| **Unapproved (rejected)** | Log in as rejected account. | **AccessRejected**; same gating as pending. |
| **Approved buyer** | Log in as approved buyer. | **MainTabs** with five tabs: Catalogue, Orders, Dashboard, Support, Account. |

### 2 — Authenticated golden journey (approved buyer)

1. **Catalogue** → open a product → **Product detail** → add to cart (respect MOQ/carton).
2. **Quick order** (if used) → add line → **Cart**.
3. **Cart** → confirm checkout-ready → **Checkout**.
4. Wait for advance calculation (not `…` / not “Unavailable”).
5. Confirm **Order value (SO)**, **Advance due**, **Balance on dispatch** render with ₹ formatting.
6. Tap **Confirm & submit** once → navigate to **Orders** tab.
7. Success banner: **“Sales Order created”** with `SO #<order_number>`, value and advance lines.
8. Pull to refresh on **Orders** → order appears in list with fulfilment timeline stages ending in **delivered** (canonical list).
9. Tap order → **Order detail** shows consistent stage index vs list.
10. **Dashboard** → lifetime order value / open count load without error.
11. **Account** → sign out → returns to welcome/onboarding path.

### 3 — Idempotency / duplicate submit (backend Sales Order)

1. Repeat golden journey through **Checkout** with the same draft loaded (do **not** clear app storage).
2. On **Checkout**, tap **Confirm & submit** rapidly twice (or background app mid-flight and retry).
3. **Pass:** second outcome shows banner **“Order already submitted”** (`isDuplicateSubmission` / `is_duplicate_submission` from RPC).
4. Record **backend evidence:** same `order_id` and `order_number` for both attempts (Supabase `submit_customer_order_v1` result or orders RPC).
5. Confirm idempotency key cleared only after confirmed success (second submit does not create a second SO).

### 4 — Offline → reconnect

1. On **Checkout** with checkout-ready draft, disable Wi‑Fi + cellular.
2. **Pass:** offline alert; submit disabled.
3. Re-enable network → advance reloads; submit enabled when key persisted and advance resolved.
4. Optional: airplane mode on **Orders** pull-to-refresh → error state with retry, list not unmounted.

### 5 — Session recovery (backend failure path)

1. Simulate backend/session verification failure (preview outage or test hook) to land on **SessionRecovery**.
2. Tap **Try again** while failure persists.
3. **Pass:** stays on **SessionRecovery**; inline error/message updates (no stacked SessionRecovery screens).
4. Restore backend → retry routes to correct access state.

### 6 — External links (access screens)

1. From **AccessPending** / **AccessRejected**, tap support/contact link.
2. **Pass:** `Linking.openURL` opens browser/mail; on failure, Alert with fallback message (no `canOpenURL` dependency).

---

## Owner physical-iPhone-only checklist (does not block merge of software RC)

Complete on the owner’s physical iPhone after iOS preview artifact exists. **Software RC is complete without this section.**

| # | Task | Record |
|---|------|--------|
| A | Link Apple Developer team to Expo; run interactive `eas credentials -p ios` | Team ID, provisioning profile date |
| B | Build iOS preview @ `2da7bb7` (or current PR HEAD) | EAS build ID + `.ipa` / install URL |
| C | Register owner iPhone UDID for internal distribution | Device name in EAS device list |
| D | Install preview build on owner iPhone | Screenshot of home screen icon |
| E | Execute sections **0–6** above on iPhone | Pass/fail per step |
| F | **VoiceOver smoke** on iPhone: Splash → Login → Catalogue → Cart → Checkout submit button | Rotor reads labels; submit has hint; alerts use `accessibilityRole="alert"` |
| G | **iPad smoke** (optional same build): layout/safe-area on Catalogue + Cart | Screenshot tablet layout |
| H | **Android phone smoke** (APK from table above): sections 1–4 minimum | APK build ID used |

---

## Sign-off template

```
RC-1B iPhone sign-off
SHA: 2da7bb76f7841e59394df0f1b968c0ac3f2328c1
iOS build ID:
Android build ID: f49a72d7-0983-48f7-8344-6e3398cc99e3
Golden journey: PASS / FAIL
SO idempotency (order_id): 
Access matrix: PASS / FAIL
Offline/reconnect: PASS / FAIL
Session recovery: PASS / FAIL
VoiceOver smoke: PASS / FAIL / DEFERRED
Tester / device: 
Date:
```
