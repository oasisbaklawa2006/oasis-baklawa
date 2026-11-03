# Visual refinement and reconciliation — 31 Oct 2026 (local, private review only)

Base: recovered `0927b747cc808474948da67eb39c7d042aec5997` (itself on `77306a0`). Both carton configurations stay **inactive**; geometry stays **pending**. Nothing pushed, merged, deployed or activated.

## 1. Restoration verification
- Archive SHA-256 checked against `RECOVERY_MANIFEST.json`: source zip, bundle and evidence zip all match.
- Bundle cloned offline; `HEAD` = `0927b747…`; parent `341cb3d6…` and prerequisite `77306a0…` present.
- Original `carton-only.patch` SHA-256 `100d1303…7742d` matches the manifest. It contains 68 files. `git diff 77306a0..0927b74` shows 71 paths: the same 68 plus `assets/carton-builder/frontal-reference.jpg`, `oasis-reference-oval.png` and `DETERMINISTIC_VISUAL_CERTIFICATION.md`, which the patch omits (binary or doc). Net difference noted, not an integrity failure.
- Fresh gates on `0927b74`: `npm ci` OK; 294/294 tests; `tsc` clean; eslint (max-warnings 0) clean; `verify:boundary`, `verify:decisions`, `rc:scan`, `rc:navigation` pass. Regenerated SVGs were byte-identical to the committed ones.
- `npm audit --omit=dev`: 52 (2 critical, 24 high) — identical to base `77306a0`; no new dependency except `react-native-svg` (already in the recovered lockfile). Scoped secret scan of the diff: 0 hits.

## 2. Reference reconciliation
| Item | 666×6 (bulk-6) | 888×4 |
|---|---|---|
| Physical geometry | UNVERIFIED (no signed mm) | UNVERIFIED |
| Layout (two columns) | Owner directive 2026-10-30: 2 columns × 3 levels | Provisional 2×2, factory arrangement unverified |
| Approved appearance | Owner photograph `frontal-reference.jpg`: ivory/white exterior, kraft interior, corrugated flaps, gold oval logo, "THIS SIDE UP" arrows, green vegetarian mark | same |
| Missing evidence | Signed dimensions, tray/lid specs, artwork manifest, flap hinge geometry | + physical packing arrangement |
Geometry, tray positions, packing order, camera and branding coordinates were **not** changed (§4).

## 3. Refinement (carton-svg.ts only, additive)
Corrugation (flute pattern + cut-edge outline) on flaps and closed top; interior depth shading behind trays; transparent-lid specular highlight and tray contact shadow; ivory exterior shading when sealed; soft two-layer ground shadow; legible "THIS SIDE UP" under both arrows as printed in the owner photograph (watermark in open state, opaque when sealed). One serializer renders all 14 frames.

## 4. Invariance
Per frame, body rect, flap polygons, tray rects, logo box, arrows and viewBox are identical to the recovered render and constant across frames (checked programmatically, all 14).

## 5. Remaining exceptions (unchanged: 34 PASS / 0 FAIL / 8 UNVERIFIED)
A2 physical proportions, E1 physical open state, E2 physical closure — need signed measurements/folding evidence (Operations; blocks physical certification). D1 approved logo, D3 handling symbols — need owner artwork approval (blocks publication/visual approval; the added "THIS SIDE UP" wording is derived from the owner photograph and is not approved printing). F6 Android, F7 iOS, F9 device performance — need real-device UAT (QA; blocks native certification). Commercial activation additionally needs Core packing-profile projection (O7), prices (O1–O3) — see `OWNER_ACTION_REGISTER.md`.

## 6. Publication safety
Private review only: logo/artwork and history are proprietary; do not publish, push publicly or attach to public PRs. Runtime screenshots use a diagnostic draft resolver and synthetic fixture products; fonts in the runtime frames come from the headless browser and are not brand fonts.
