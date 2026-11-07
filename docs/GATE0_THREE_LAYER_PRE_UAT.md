# GATE0 — Buyer Android / Three-Layer Pre-UAT Control

Mission Control: https://github.com/oasisbaklawa2006/Oasis-Baklawa-Central/issues/632
Parent activation: https://github.com/oasisbaklawa2006/Oasis-Baklawa-Central/issues/629
Original OTP provider failure: https://github.com/oasisbaklawa2006/Oasis-Baklawa-Central/issues/583

**This is a certification lane, not a replacement authentication implementation.** Do not create production users, send real OTP, rotate credentials, approve applications, deploy Android artifacts, or change Supabase as part of static Gate0 checks.

## Definition of tested states

- `PASS`: test executed, expected outcome observed, exact build/commit/environment and evidence recorded.
- `FAIL`: executed and behavior deviated from the contract.
- `BLOCKED`: prerequisite, credential, provider or safe test surface unavailable.
- `NOT_EXECUTED`: the scenario has not run. Must never be counted as PASS.
- `STATIC_PASS`: limited to code/workflow assertions and unit tests; **not** a device or provider PASS.

Every result must include test ID, actual technique (source/unit/ephemeral browser/provider/physical), SHA, EAS build ID where applicable, environment, device, actor role, observed behavior, sanitized correlation ID, evidence URL, owner and corrective action. Record not-tested and blocked explicitly.

## Existing test evidence, properly classified

1. `Buyer Mobile Golden Path Certification` authenticates with email/password and reads customer-safe RPCs. Its scheduled job currently checks out `cursor/buyer-tranche5-parity-594b`, which may not match current `main` or a real APK. Do not use green scheduled runs as release certification.
2. `Central Buyer Golden Path Certification` uses disposable local Core and synthetic fixtures and browser viewports; not a physical Android test.
3. `Android UAT EAS Build` pins a `main` SHA and verifies internal build configuration. Successful EAS build is **not** proven OTP delivery or dashboard reachability.
4. `validate-msg91-build-config.mjs` prevents a known Central web-only widget from being shipped into the native mobile app; it cannot prove current provider configuration, SMS delivery or callback handling.
5. `ensure-cert-buyer-onboarding.mjs` can submit a new governed application from the old certification workflow. **Do not run or broaden this as a read-only test.** Any production/staging application write needs its separately governed test identity and approval.

## Layer 1 — Deterministic bot / source and synthetic execution

The isolated `scripts/gate-zero/certify-source.mjs` and `gate-zero-source-audit.yml` run without secrets or network operations. They inspect exact SHA, native APK build guards, approved preflight before OTP, request-ID integrity, OTP→Supabase→dashboard wiring, resend eligibility and the provenance weakness of the scheduled probe. Existing `npm test`, typecheck and lint run as software regression gates.

This is necessary, not sufficient. A future sanctioned end-to-end bot using a dedicated MSG91 test integration and eligible test account must prove the provider conversation without unapproved live sends or real-customer mutations. Provider `accepted` and request ID must not be represented as SMS `delivered`.

## Layer 2 — Independent AI assessment

Assign an AI reviewer **separate from the implementing agent** the exact commit, source-audit JSON and redacted test logs. The reviewer must independently examine:

- Unknown, pending, rejected, employee, ambiguous and approved eligibility paths.
- Stale sendOTP callback, no request ID, delayed CAPTCHA, no delivered SMS, wrong OTP, expired OTP, double submit and cooldown.
- MSG91 verified identity versus Supabase user ID, session creation/rollback, stale app state, navigation/role leakage.
- Android network disconnect before/during/after provider verification, app restart, token expiry and offline pending UI.
- EAS native widget type, exact APK SHA, backend binding and version mismatch.
- Potential hidden test skips, production fixture mutation and false PASS classifications.

Return `FINDING | NEGATIVE_CASE | EXECUTED_EVIDENCE | UNVERIFIED` per scenario. **AI agreement alone never closes a test.** Defects enter the bounded repair ledger.

## Layer 3 — Staff physical rehearsal (before owner UAT)

Assigned staff uses the **same recorded EAS APK** intended for owner testing:

| Step | Observation required |
|---|---|
| 1. Install | EAS build ID, Android package and device OS recorded; APK matches release SHA |
| 2. Environment | Exact backend project confirmed without exposing secret values |
| 3. Preflight | Approved buyer proceeds; pending/unknown/employee are not sent OTP |
| 4. OTP send | Provider request ID/correlation ID recorded in sanitized logs |
| 5. Delivery | Fresh SMS actually arrives on authorized phone, with received timestamp. Never record OTP digits |
| 6. OTP verification | Correct code succeeds, wrong/expired code rejected with recoverable error |
| 7. Session/dashboard | Eligible buyer sees correct dashboard; employee/admin views inaccessible |
| 8. Restart/recovery | Cold restart, expired session, Wi-Fi/mobile-data switch and error recovery checked |
| 9. Handoff | Staff signs PASS/FAIL/BLOCKED and attaches non-secret evidence |
| 10. Owner | Owner is invited only once every required staff test has passed |

Staff/owner must not use production customer data or OTP secrets for screenshots. A provider rejection must be diagnosed at integration boundary first, not treated as authorization for a full module rewrite.

## Repair control / definition of exit

**Single failure → exact boundary → reproducible test → smallest PR → related regression → re-execute exact same journey.**

Do not start broader module redevelopment when a single provider setting, selector, auth-contract mismatch or test-fixture issue explains the observed failure. Escalate architectural redesign only with explicit evidence that a localized contract repair cannot meet requirements.

Gate0 closes only on four distinct proofs: source/bot PASS, independent AI findings resolved, staff physical PASS, and exact APK/back-end binding. Owner UAT comes afterward. Current Gate0 status is **BLOCKED** until live/provider and physical evidence exists.
