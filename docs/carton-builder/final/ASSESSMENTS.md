# Commercial boundary, test method and dependency assessment — 31 Oct 2026

## 1. Commercial and financial boundary (proved, not assumed)
- **Changed files since V3 (`bcee58a`) outside carton rendering, carton metadata, tests, scripts and docs:** `src/components/CartonVisual.tsx` (display of the view note and sizing only) and `src/components/CartonSvg*.tsx` (artwork sizing). No file under pricing, GST, freight, MOQ policy, credit, payment, checkout, order submission, Genie, catalogue price-state, draft-add-guard, Core or Supabase paths was modified (`git diff --name-only bcee58a HEAD` is listed in `changed-files.txt`).
- **Behavioural proof:** `carton-commercial.test.ts`, `draft-add-guard.test.ts`, `catalogue-price-state.test.ts`, `genie-product-resolution.test.ts`, `carton-journey.test.ts` pass; `carton-journey.test.ts` asserts that previews, splitting and validation never change a customer quantity, and that MOQ/increment are evaluated on the whole line by the existing validator.
- **Activation:** all three catalogue entries remain `active:false`; `getCartonSupport()` still reports unavailable; the production resolver refuses pending geometry. Journey tests activate only private copies.
- **Not proven (by design):** authenticated end-to-end submission was not executed (no authorised environment; the carton seam has no Core packing projection). Prices, GST, freight, credit and approval controls are untouched, not independently re-tested against Core.

## 2. Testing method (exact)
| Layer | Method | Result |
|---|---|---|
| Unit, geometry, sequence, snapshot, feasibility, journey, commercial | `node --import tsx --test` (346 tests; see `fresh-test-results.txt`) | pass |
| Types / lint | `tsc --noEmit`; `eslint --max-warnings 0` | pass |
| Boundary, decisions, forensic scan, navigation | repo scripts | pass |
| Web build | `expo export --platform web` | exit 0 |
| Runtime component, 26 states, a11y DOM, reduced motion, cleanup, no external requests, 9 viewport widths (320–1280) | Playwright + Chromium (desktop emulation), react-native-web | pass |
| Android, iOS, real devices, emulators, simulators | **not available / not performed** | UNVERIFIED |
| Screen reader, keyboard navigation, mobile landscape, slow network, browser refresh persistence | not executed | UNVERIFIED |
Desktop browser emulation is not device certification.

## 3. Dependency / security assessment (`npm audit --omit=dev`, lockfile unchanged since V3)
Totals: 68 (2 critical, 24 high, 39 moderate, 3 low); 52 at the V3 check, the increase being newly published advisories, not changes here. `npm audit fix --dry-run` reduces nothing without breaking changes; every remaining fix is a semver-major (Expo 51 → 58, React Navigation 6 → 7), which would be a platform migration and is out of scope; none was forced.
By role (classification by package role, not dynamic reachability analysis):
- **Build/CLI tooling, not in the shipped bundle:** shell-quote (critical), tar (critical), @expo/cli, @xmldom/xmldom, cacache, babel-preset-expo, babel-plugin-react-compiler, postcss, image-size, joi, compression, node-forge, js-yaml, brace-expansion, source-map-js, zod, zod-validation-error. Exposure is to developer/CI machines processing untrusted input, not to buyers.
- **Possibly in the web bundle:** @react-navigation/* → query-string → decode-uri-component (denial of service through crafted URLs on web deep links); nanoid (only with unbounded custom generators).
Recommendation: schedule the Expo/React Navigation major upgrade as its own programme; until then restrict build agents, keep untrusted URLs off the web build, and re-audit at release. Not resolved by this mission.
