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
    status: "inactive-specification-only",
  },
  {
    // Mapping of "RTC1×10" to the existing third catalogue entry (Type C, 10 trays) is an assumption awaiting owner confirmation.
    configId: "bulk-10",
    label: "RTC1×10",
    cartonInches: [13, 8.5, 13],
    dimensionBasis: "internal",
    printedCartonSizeIn: null,
    printedHeightOptionsMm: [32, 40],
    primary: {
      id: "rtc1-300x210", name: "RTC1 300×210 transparent tray with lid", lengthMm: 300, breadthMm: 210, heightMm: 32,
      reference: "Owner product photographs: 300x210 RTC, 1 kg & 2 kg; height 32 mm per owner correction", heightIncludesLid: null,
    },
    primaryPacksPerCarton: 10,
    confirmedArrangement: null,
    frozenVisualArrangement: null,
    internalLevels: null,
    maxExternalStackCount: 4,
    status: "inactive-specification-only",
  },
]);

export function physicalSpecFor(configId: string): CartonPhysicalSpec | undefined {
  return CARTON_PHYSICAL_SPECS.find((s) => s.configId === configId);
}
