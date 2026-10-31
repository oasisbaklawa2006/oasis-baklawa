/**
 * Register of owner-supplied factory photographs (31 Oct 2026). Evidence metadata only: it records what each photograph
 * shows and, explicitly, what it does NOT establish. No photograph is treated as a packing trial or a measurement.
 */
export type PhotoView = "closed-exterior" | "open-top-view";
export interface FactoryPhoto {
  id: string;
  sha256: string;
  configHint: "888x4" | "bulk-6" | "bulk-10-candidate";
  view: PhotoView;
  shows: readonly string[];
  doesNotEstablish: readonly string[];
}

const TOP_LIMITS = [
  "lower-layer arrangement (hidden below the visible boxes)",
  "total box count in the carton",
  "clearances, lid/flap interference or tolerance (no measurement)",
] as const;

export const FACTORY_PHOTOS: readonly FactoryPhoto[] = Object.freeze([
  { id: "FP-01", sha256: "e5b9b8a409feb291", configHint: "888x4", view: "open-top-view",
    shows: ["white printed exterior, brown corrugated interior, four open flaps", "two lidded transparent boxes side by side across the carton length (top layer)", "gold disc logo, upward arrows, green vegetarian mark, side label 888X4"], doesNotEstablish: TOP_LIMITS },
  { id: "FP-02", sha256: "eed6846ed740f27c", configHint: "888x4", view: "open-top-view",
    shows: ["open carton with two lidded boxes visible from above", "brown corrugated flaps with flute lines"], doesNotEstablish: TOP_LIMITS },
  { id: "FP-03", sha256: "0da9369a0fdbdd89", configHint: "888x4", view: "closed-exterior",
    shows: ["closed carton, clear tape along the centre seam of the top running the long way", "front face: small arrow, large gold disc logo, large arrow, green vegetarian mark", "side face: 888X4, category tick-boxes, handling icons, stack-4 icon, printed 'Carton Size : 20 x 13.75 x 13.25', address"],
    doesNotEstablish: ["internal length (printed 20 in differs from owner-confirmed internal 20.75 in)", "carton contents"] },
  { id: "FP-04", sha256: "a742712b592c5177", configHint: "888x4", view: "open-top-view",
    shows: ["open carton, two lidded boxes visible near the floor with the upper interior empty"], doesNotEstablish: [...TOP_LIMITS, "whether the carton was partly packed or only one layer was photographed"] },
  { id: "FP-05", sha256: "1447ebe2173cf1a1", configHint: "888x4", view: "open-top-view",
    shows: ["two lidded boxes with baklawa pieces visible through the lids"], doesNotEstablish: TOP_LIMITS },
  { id: "FP-06", sha256: "58215f632f85ab04", configHint: "888x4", view: "open-top-view",
    shows: ["two lidded boxes side by side, rectangular lids with inset panel, pieces about 4 across and several rows deep, film wrap over lids"], doesNotEstablish: TOP_LIMITS },
  { id: "FP-07", sha256: "516b9552c4969c72", configHint: "bulk-6", view: "closed-exterior",
    shows: ["closed carton, side label 'BURME , 666', taped top seam, same print layout as 888X4"], doesNotEstablish: ["any interior packing of 666×6 (no open or populated 666 photograph supplied)", "printed carton size (partly obscured)"] },
  { id: "FP-08", sha256: "f7176ecd5ba24bc3", configHint: "bulk-10-candidate", view: "open-top-view",
    shows: ["taller, narrower carton opened, one lidded flat tray visible at the floor"], doesNotEstablish: [...TOP_LIMITS, "that this carton is RTC1×10 (owner has not stated it)"] },
  { id: "FP-09", sha256: "cbd79b210cd6f89e", configHint: "bulk-10-candidate", view: "open-top-view",
    shows: ["same carton, tray with round pieces under a lid, hand in frame"], doesNotEstablish: TOP_LIMITS },
  { id: "FP-10", sha256: "58c89a9286b80cdc", configHint: "bulk-10-candidate", view: "open-top-view",
    shows: ["same carton with a large flat lidded tray near the rim; tick-boxes '32mm' and '40mm' on the side label"], doesNotEstablish: [...TOP_LIMITS, "tray count or stacked height"] },
  { id: "FP-11", sha256: "dd3204011b7a3d16", configHint: "bulk-10-candidate", view: "closed-exterior",
    shows: ["closed carton with tape and side label showing tick-boxes '32mm' and '40mm', categories and stack-4 icon"], doesNotEstablish: ["which tray height the carton was packed with"] },
]);
