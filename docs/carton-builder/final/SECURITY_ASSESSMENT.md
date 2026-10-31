# Security and dependency assessment — closure run (31 Oct 2026)

Method: `npm audit --omit=dev` (production graph) before and after; Expo web and Android bundles exported with `--dump-sourcemap` and every `node_modules` package in the source maps listed (87 packages ship); each advisory chain classified by whether its package ships. Reachability by call-path was **not** analysed dynamically; "shipped" means the package is present in the bundle, and the advisory text identifies the vulnerable feature.

## Result
| | Start (ef8aeb7) | Now |
|---|---|---|
| Total | 68 | **60** |
| Critical | 2 | 1 (`tar`, build tooling) |
| High | 24 | 17 |
| Moderate / Low | 39 / 3 | 39 / 3 |

Repairs applied (lockfile only; patch/minor, no additions or removals; tests, typecheck, lint, web export re-run): nanoid 3.3.17 → 3.3.20; shell-quote 1.10.0 → 1.12.0; brace-expansion 1.1.18 → 1.1.21 and 2.1.4 → 2.1.7; compression 1.8.1 → 1.8.2; joi 17.13.4 → 17.13.9; js-yaml 3.15.1 → 3.15.2 and 4.3.1 → 4.3.2; node-forge 1.4.0 → 1.4.2; source-map-js 1.2.1 → 1.2.2.
Not applied (unsafe): `npm audit fix` proposed react-native 0.88.1 and other majors; rejected.

## What remains (per advisory in `SECURITY_ADVISORIES.csv`)
- **11 flagged packages are present in the shipped bundles.** Six are React Navigation 6 packages flagged only because they sit above `query-string` → `decode-uri-component` (denial of service from crafted percent-encoded URLs; relevant to web URLs and deep links; fix requires React Navigation 7, a major migration). `expo`, `expo-asset`, `expo-constants` and `react-native` ship, but their advisory chains run through Expo/React Native CLI and config tooling (build or development time); no runtime path was identified.
- **49 are build/CLI tooling** (`tar` critical, `@expo/cli`, `@xmldom/xmldom`, `cacache`, `babel-*`, `postcss`, `image-size`, `zod`, …): exposure is to developer and CI machines handling untrusted input, not to buyers. Fixes need Expo 58.
- No advisory was found in code authored for the carton builder.

## Verdicts
- **Assessment: complete.** Every advisory has a classification, exposure and remediation path.
- **Remediation: partial** (8 of 68 closed by safe lockfile updates; rest need major upgrades).
- **Release security clearance: NOT granted.** A separately scoped migration (Expo 51 → 58 with React Native, React Navigation 6 → 7) is required, with its own regression and device campaign; it was not started because forcing it is outside this mission.

## Migration plan outline (separate programme)
1. Branch from the release baseline; upgrade Expo SDK stepwise (51 → 52 → … → 58), React Native with it, and React Navigation to 7. 2. Replace removed APIs; re-run unit, browser and device suites. 3. Re-audit, re-run Android/iOS UAT and the payment/auth certification gates. 4. Release-risk: highest for navigation (every screen), native builds (MSG91 OTP module), and web deep links. Estimate and scheduling belong to the owner.
