# External action pack (everything left that software cannot do)

## A. Factory (Operations) — detailed sheets in `FACTORY_VERIFICATION_PROTOCOL.md`
| Carton | Do | Record | Pass if |
|---|---|---|---|
| 666×6 | pack six closed Deluxe 666 boxes: two across, one deep, three levels; close and tape; photograph open and populated (none exist) | internal L×B×H of 3 cartons; box L×B×H with lid; clearances; bulge | flaps meet without force, no lid lift or crushing |
| 888×4 | measure internal length of 3 cartons (**printed 20 in vs confirmed 20.75 in**); pack four closed boxes: two across, one deep, two levels | length, box sizes, clearances (length margin 7.05 mm is tightest) | as above; length reconciled in writing |
| RTC1×10 (32 mm, 1 kg) | stack ten closed tray-and-lid units vertically; close and tape | each closed-unit height, total stacked height, nesting, lid interference, flap clearance (320 mm nominal in 330.2 mm) | closes without force; stack ≤ internal height |
| All three | four-closed-carton stacking: attach the supplier box-compression certificate, or run a documented stack test under a safe protocol (guarded, no one beneath, load applied gradually); dimensions alone prove nothing | certificate or test record | owner-specified acceptance |
The **40 mm RTC option is outside this certification scope** until separately specified and tested.

## B. Artwork approval sheet (`artwork-approval-sheet.png`)
Compares the authorised logo asset with the factory print in FP-01, FP-03 and FP-07. Needed: the print-ready artwork file for the factory mark (or a statement that the oval asset is the approved digital mark), approval of arrow/handling-symbol layout, and of the side-panel print (indicative only in the supplementary exterior view).

## C. Core / environment
Implement the packing-profile projection (spec v1), load Operations' packing master, provide an authorised test environment with buyer credentials, then run the live journey and the non-production plan.

## D. Devices and assistive technology
Android and iOS physical devices (or simulators with a recorded method) for UAT; a real screen-reader pass (TalkBack, VoiceOver, NVDA/JAWS) and keyboard-only pass of the whole Buyer app. Automated results exist (`runtime-web.json`) but are not a substitute.

## E. Release security
Schedule the Expo/React Native/React Navigation major migration (see `SECURITY_ASSESSMENT.md`) before any release; 60 advisories remain.

## F. Owner
Visual approval of the instructional and exterior views after A–D; decisions on logo opacity/placement in the open view; written confirmation of the physical gates.
