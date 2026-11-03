# Factory-photograph reconciliation — 31 Oct 2026 (private review only)

**Update (V5):** the owner confirmed that FP-08…FP-11 show the actual 1 kg tray and its shipping carton, i.e. **RTC1×10** (`bulk-10`), with ten 300 × 210 × 32 mm trays in one vertical stack. Photographic identity and the owner-specified arrangement are CONFIRMED; pack-and-close testing is NOT performed and not claimed. The 40 mm option remains separate and its capacity unverified.

Base `b35fe77` (V4 correction), frozen V3 `bcee58a`. Eleven photographs were supplied (the brief said six): FP-01…FP-06 are the 888×4 carton (FP-01, 02, 04, 05, 06 open; FP-03 closed), FP-07 the 666 carton closed, FP-08…FP-11 the RTC1×10 carton (owner-confirmed; its side label offers 32 mm / 40 mm tick-boxes). Register: `src/lib/carton-photo-evidence.ts` (ids and hash prefixes, what each shows, and what it does **not** establish). The photographs themselves are included only in the private ZIP, not in git.

## 1. What each photograph shows / does not establish
| ID | Carton | View | Shows | Does not establish |
|---|---|---|---|---|
| FP-01 | 888×4 | open, top | white printed exterior, brown corrugated interior, four open flaps; two lidded boxes side by side across the length; gold disc logo, arrows, green vegetarian mark, side label "888X4" | lower layer, total count, clearances |
| FP-02 | 888×4 | open, top | two lidded boxes from above; flute lines | same |
| FP-03 | 888×4 | closed | clear tape along the long centre seam of the top; front face print; side face with tick-boxes, handling icons, stack-4 icon, **"Carton Size : 20 x 13.75 x 13.25"**, address | internal length (printed 20 in vs confirmed 20.75 in); contents |
| FP-04 | 888×4 | open | two lidded boxes near the floor, upper interior empty | whether partly packed or one layer |
| FP-05 | 888×4 | open | baklawa pieces visible through lids | lower layer, count, clearances |
| FP-06 | 888×4 | open | two boxes side by side, inset lid panel, film wrap, pieces about 4 across × several rows | lower layer, count, clearances |
| FP-07 | 666×6 | closed | side label "BURME , 666", taped seam, same print layout | **any 666 interior packing** (no open or populated 666 photograph supplied); printed size (obscured) |
| FP-08…10 | **RTC1×10** (identity confirmed by owner) | open | one flat lidded 1 kg tray at floor / near rim | tray count and stacked height of the ten-tray stack; clearances |
| FP-11 | **RTC1×10** (confirmed) | closed | taped, side label tick-boxes "32mm" and "40mm", stack-4 icon | which tray height was packed |

## 2. Three record-and-confirm findings
1. **888×4 printed size.** The carton prints "20 x 13.75 x 13.25", while the owner confirmed internal 20.75 × 13.75 × 13.25. Width and height match; length differs by 0.75 in. At 20 in (508 mm) four boxes cannot fit (best capacity 3, tested). FP-01/02/06 show two 260 mm-class boxes side by side across the length, which is consistent with ≥ 520 mm and with 20.75 in, but is a photograph, not a measurement. Keep 20.75 in as confirmed; Operations should measure one carton and reconcile the printed label (an artwork correction if the label is wrong).
2. **RTC1×10 height options.** The side label offers 32 mm and 40 mm. The owner-confirmed 10-tray capacity applies to the 1 kg, 32 mm tray (320 of 330.2 mm). The 40 mm option is kept separate: `alternateHeights [{40 mm, unverified}]`; by height alone it would hold eight, which is arithmetic, not a capacity claim, and needs its own decision.
3. **666×6 interior unevidenced.** Only one closed 666 photograph exists. The 2 across × 3 level arrangement remains mathematically derived only.

## 3. Reconciliation of the renderer with the photographs
| Item | Photograph | Renderer after this change |
|---|---|---|
| Exterior colour | white printed corrugated | closed exterior fill ivory → white (`#f7f6f2`) — **changed** |
| Closed top / tape | one clear tape strip along the long centre seam | perpendicular strip removed; lengthwise translucent tape band added — **changed** |
| Interior | natural brown corrugated with flute lines | already brown with flute pattern |
| Four-flap closure | long flaps meet at the seam, short flaps beneath | closed top drawn as the meeting flaps (frozen polygon); short-flap overlap not drawn |
| Front is opaque | opaque white | open view draws the front transparent **only as an instructional visualisation**; labelled in the SVG (`data-view`) and in the app ("Instructional view: …"); the closed view carries "Exterior illustration based on factory photographs…" — **changed** |
| Gold logo | rounder gold disc with sparkle, larger, left-of-centre | NOT changed: frozen oval asset and position. The factory print is a different, rounder artwork; the approved print artwork file is needed |
| Arrows | one small arrow at the left, one large arrow right of the logo, "THIS SIDE UP" under each; more on the side face | two equal arrows at frozen coordinates; NOT moved (position change needs approval) |
| Vegetarian mark | green square with dot, top right near the corner | drawn near the right; frozen |
| Side face | "888X4"/"BURME , 666" label, category tick-boxes, handling icons, stack-4, size, address | not drawn (front view only) |
| Boxes | lidded transparent boxes with inset lid panel, film wrap, pieces about 4 across | lid inset panel, wall highlights, 4-across illustrative pieces (V4) |
| Perspective / lighting | handheld three-quarter views, flash on white | fixed front camera by design; not changed |
No physical dimension, tray position, packing order, capacity, commercial logic, price, MOQ or activation state changed. Geometry identical to V3 on all 14 frames (viewBox, flaps, body, closed polygon, tray rectangles and order, logo box, arrows, branding opacity, floor, frame width); intended differences: root `data-view` attribute, white exterior fill, tape band, V4 box styling.

## 4. Certification gaps
Packing trial (all three); measured internal length of the 888×4 carton vs the printed 20 in; 666×6 open/populated photographs and trial; RTC1×10 pack-and-close trial (ten closed trays, lid height, nesting) and the separate 40 mm decision; approved print artwork (disc logo, arrow layout) and an owner decision to move logo/arrows; side-face artwork (not rendered); device UAT; authenticated integration; commercial activation (Core projection, prices, MOQ); dependency advisories. Photographs are evidence of appearance, not of packing certification; no owner artwork approval is claimed.
