/**
 * Owner-confirmed physical packaging master (31 Oct 2026, internal-dimension correction applied: 888×4 length is 20.75 in). Metadata only: it never drives prices, MOQ,
 * eligibility or activation. Every attribute the owner has not confirmed stays null/'unconfirmed'.
 */
export const MM_PER_INCH = 25.4;
export const inchesToMm = (inches: number): number => inches * MM_PER_INCH;

/** Whether the owner's carton dimensions are the outside or the usable inside. Owner confirmed INTERNAL for all three on 31 Oct 2026. */
export type DimensionBasis = "unconfirmed" | "external" | "internal";

export interface PrimaryPackSpec {
  id: string;
  name: string;
  /** Millimetres, as supplied by the owner/reference. */
  lengthMm: number;
  breadthMm: number;
  heightMm: number;
  reference: string;
  /** True/false once Operations confirms whether the quoted height includes the lid. */
  heightIncludesLid: boolean | null;
}

export interface CartonPhysicalSpec {
  configId: string;
  label: string;
  /** Owner-supplied inches, Length × Breadth × Height. */
  cartonInches: readonly [number, number, number];
  dimensionBasis: DimensionBasis;
  /** Size text printed on the carton in the factory photographs (inches, L×B×H), where legible. Evidence only; owner-confirmed internal figures govern. */
  printedCartonSizeIn: readonly [number, number, number] | null;
  /** Tray heights (mm) printed as tick-box options on the carton side label, where photographed. */
  printedHeightOptionsMm: readonly number[] | null;
  primary: PrimaryPackSpec;
  /** (1) primary packs per shipping carton. */
  primaryPacksPerCarton: number;
  /** (2) arrangement inside the carton: null until Operations confirms the real orientation. */
  confirmedArrangement: null | { columnsAcrossLength: number; rowsAcrossBreadth: number; levels: number };
  /** Arrangement drawn by the frozen visual geometry (provisional, not physical evidence). */
  frozenVisualArrangement: null | { columnsAcrossLength: number; rowsAcrossBreadth: number; levels: number };
  /** (3) internal packing levels. */
  internalLevels: number | null;
  /** (4) maximum number of complete shipping cartons stacked vertically. Not an internal level count. */
  maxExternalStackCount: number;
  /** Owner-confirmed identity link between this carton and the factory photographs that show it (ids from carton-photo-evidence). */
  photographicIdentity: null | { status: "confirmed-by-owner"; photoIds: readonly string[] };
  /** Whether the arrangement was specified by the owner (not a packing trial). */
  arrangementBasis: "none" | "owner-specified" | "frozen-visual-provisional";
  /** Physical pack-and-close trial evidence. Nothing has been performed. */
  packTrial: "not-performed";
  /** Alternative primary-pack heights that exist on the carton label but whose capacity is NOT verified. */
  alternateHeights: readonly { heightMm: number; capacityStatus: "unverified" }[];
  status: "inactive-specification-only";
}

export const CARTON_PHYSICAL_SPECS: readonly CartonPhysicalSpec[] = Object.freeze([
  {
    configId: "bulk-6",
    label: "666×6",
    cartonInches: [15.5, 10.75, 13.75],
    dimensionBasis: "internal",
    printedCartonSizeIn: null,
    printedHeightOptionsMm: null,
    primary: {
      id: "deluxe-box-666", name: "Deluxe Box 666 (transparent, lidded)", lengthMm: 265, breadthMm: 190, heightMm: 115,
      reference: "Owner screenshot: M.C. Pipwala Delux box-666, 19 x 26.5 x 11.5 cm", heightIncludesLid: null,
    },
    primaryPacksPerCarton: 6,
    confirmedArrangement: null,
    frozenVisualArrangement: { columnsAcrossLength: 2, rowsAcrossBreadth: 1, levels: 3 },
    internalLevels: null,
    maxExternalStackCount: 4,
    photographicIdentity: null,
    arrangementBasis: "frozen-visual-provisional",
    packTrial: "not-performed",
    alternateHeights: [],
    status: "inactive-specification-only",
  },
  {
    configId: "888x4",
    label: "888×4",
    cartonInches: [20.75, 13.75, 13.25],
    dimensionBasis: "internal",
    printedCartonSizeIn: [20, 13.75, 13.25],
    printedHeightOptionsMm: null,
    primary: {
      id: "nakoda-10l-container", name: "Nakoda 10 L container (transparent, lidded)", lengthMm: 340, breadthMm: 260, heightMm: 160,
      reference: "Owner screenshot: Nakoda Plastic Container Box 10L, 34 x 26 x 16 cm", heightIncludesLid: null,
    },
    primaryPacksPerCarton: 4,
    confirmedArrangement: null,
    frozenVisualArrangement: { columnsAcrossLength: 2, rowsAcrossBreadth: 1, levels: 2 },
    internalLevels: null,
    maxExternalStackCount: 4,
    photographicIdentity: null,
    arrangementBasis: "frozen-visual-provisional",
    packTrial: "not-performed",
    alternateHeights: [],
    status: "inactive-specification-only",
  },
  {
    // RTC1×10 = catalogue entry bulk-10 (Type C, 10 trays): owner-confirmed 31 Oct 2026.
    configId: "bulk-10",
    label: "RTC1×10",
    cartonInches: [13, 8.5, 13],
    dimensionBasis: "internal",
    printedCartonSizeIn: null,
    printedHeightOptionsMm: [32, 40],
    primary: {
      id: "rtc1-300x210", name: "RTC1 300×210 transparent tray with lid", lengthMm: 300, breadthMm: 210, heightMm: 32,
      reference: "Owner product photographs: 300x210 RTC; owner-confirmed 1 kg tray 300 x 210 x 32 mm (FP-08..FP-11 show this tray and carton)", heightIncludesLid: null,
    },
    primaryPacksPerCarton: 10,
    // Owner confirmed (31 Oct 2026): FP-08..FP-11 show the 1 kg tray and its carton; one vertical stack of ten trays.
    confirmedArrangement: { columnsAcrossLength: 1, rowsAcrossBreadth: 1, levels: 10 },
    frozenVisualArrangement: null,
    internalLevels: 10,
    maxExternalStackCount: 4,
    photographicIdentity: { status: "confirmed-by-owner", photoIds: ["FP-08", "FP-09", "FP-10", "FP-11"] },
    arrangementBasis: "owner-specified",
    packTrial: "not-performed",
    alternateHeights: [{ heightMm: 40, capacityStatus: "unverified" }],
    status: "inactive-specification-only",
  },
]);

export function physicalSpecFor(configId: string): CartonPhysicalSpec | undefined {
  return CARTON_PHYSICAL_SPECS.find((s) => s.configId === configId);
}
