# Visual correction V3 — 31 Oct 2026 (local, private review only)

Baseline `8995327…` (on recovered `0927b74…`, prerequisite `77306a0`). Inactive configurations, pending geometry, no commercial change. Nothing pushed, merged, deployed or activated.

## What changed
1. **Carton scale/responsiveness (presentation only).** The adapters used a fixed 240 px artwork height, so on wide cards the carton rendered ~320 px wide and left blank margin; the serializer's 1000×750 view also carried ~35 % empty space above short cartons. Now `CartonSvg` (web and native) sizes the artwork from the viewBox ratio (width 100 %, aspect preserved, capped at 420 px tall). `renderCartonSvg(..., view)` gained an optional `'tight'` view that only crops the viewBox (constant per carton across all frames); the default `'full'` output is unchanged. At a 1000 px viewport the carton is ~766 px wide instead of ~320 px; at 320–390 px it uses ~89–91 % of the viewport width (unchanged width, no wasted height). Measured at 320, 360, 390, 430, 600, 768, 900, 1000 and 1280 px for four states per carton: no page overflow, artwork inside its card, aspect ratio preserved.
2. **Trays.** Restrained edge definition only: a faint lid underside line and a bottom edge line inside each tray group. No new shapes, lids, products or photography.
3. **Logo.** No change (see below).

## Logo legibility — finding and decision
Measured contrast (p5/p95 luminance ratio) of the printed logo box per state (`logo-contrast.json`): empty ≈ 1.57–1.58 (watermark at the owner-set opacity 0.18); it rises to 1.95–2.51 once trays overlap the logo box, because lid edges and sweets add texture beneath the watermark, not because the logo gets clearer.
- Opacity: enforced ≤ 0.2 by an existing test; the wall must stay transparent so packed trays are visible.
- Layer order: branding already draws above trays; trays are not hidden.
- Image quality: the logo PNG is 501×271 px displayed at 220×112 units (≥ 2× oversampled at 1000 px); no resampling issue.
- Scale: fixed by the carton width; improved only by the larger presentation above.
**Decision:** keep opacity, position, size and layer order. A more legible logo would require making the front opaque or moving/resizing printing, which is not permitted without approval and would misrepresent a transparent front. Trade-off documented; owner decision needed only if a different watermark treatment is wanted.

## Closed carton
Ivory top and body, flap edge, arrows, vegetarian symbol, "THIS SIDE UP" and ground shadow reviewed in all 14 frames' sealed states. The centre seam strip comes from the recovered baseline and is **not** verified physical tape/closure geometry. E1/E2 remain UNVERIFIED.

## Verification
294 → 296 tests (2 added: tight-view crop invariance and artwork ratio) pass; tsc, eslint (max-warnings 0), `verify:boundary`, `verify:decisions`, `rc:scan`, `rc:navigation` pass. `npm audit --omit=dev`: 52, identical to base. Scoped secret scan: 0. Runtime harness: 14 states, pending-geometry gate, 5 malformed previews rejected, accessible count/range, live reduced-motion change and cleanup, no external requests. Geometry invariance against `8995327` (viewBox, flaps, body, tray rects/order, sweets, logo box/opacity, arrows, floor) is identical across all 14 frames (`geometry-invariance-vs-8995327.json`).

## Verdicts (separate)
| Area | Verdict |
|---|---|
| Technical renderer | PASS (local tests + browser harness) |
| Visual presentation | Improved; owner visual review pending (no approval claimed) |
| Physical geometry | UNVERIFIED (888×4 provisional; both pending) |
| Artwork approval | UNVERIFIED (D1, D3) |
| Android/iOS UAT | NOT PERFORMED (F6, F7, F9 UNVERIFIED) |
| Authenticated Buyer integration | NOT PERFORMED (carton support unavailable by design) |
| Commercial activation | NOT ACTIVATED; blocked by Core projection, prices, MOQ (O1–O3, O7) |
