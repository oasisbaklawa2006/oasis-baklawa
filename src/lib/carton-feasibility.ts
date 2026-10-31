import { inchesToMm, type CartonPhysicalSpec } from "./carton-physical-spec";

/** Pure dimensional audit. Axis-aligned boxes only; no wall thickness, tolerance, lid interference or nesting is invented. */
export type Axis = "L" | "B" | "H";
export interface Orientation { alongL: number; alongB: number; alongH: number; label: string }
export interface Fit { orientation: Orientation; nx: number; ny: number; nz: number; capacity: number; slackMm: { L: number; B: number; H: number } }
export type Verdict = "mathematically-feasible" | "feasible-under-unverified-assumptions" | "dimensionally-incompatible";

const eps = 1e-9;
const count = (space: number, size: number) => Math.floor((space + eps) / size);

export function orientations(dims: readonly [number, number, number]): Orientation[] {
  const [a, b, c] = dims;
  const perms: [number, number, number][] = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];
  return perms.map(([l, br, h]) => ({ alongL: l, alongB: br, alongH: h, label: `${l}×${br}×${h} mm along L×B×H` }));
}

export function fitFor(cartonMm: readonly [number, number, number], o: Orientation): Fit {
  const [L, B, H] = cartonMm;
  const nx = count(L, o.alongL), ny = count(B, o.alongB), nz = count(H, o.alongH);
  const used = { L: nx * o.alongL, B: ny * o.alongB, H: nz * o.alongH };
  return { orientation: o, nx, ny, nz, capacity: nx * ny * nz, slackMm: { L: L - used.L, B: B - used.B, H: H - used.H } };
}

export interface FeasibilityReport {
  configId: string; label: string; cartonMm: [number, number, number]; primaryMm: [number, number, number]; required: number;
  bestCapacity: number; orientationsThatFit: Fit[]; allOrientations: Fit[];
  frozenVisual: null | {
    arrangement: { columnsAcrossLength: number; rowsAcrossBreadth: number; levels: number };
    orientation: Orientation; required: { L: number; B: number; H: number }; available: { L: number; B: number; H: number };
    clearanceMm: { L: number; B: number; H: number }; fits: boolean;
    /** Only when the basis is not confirmed internal: largest wall thickness per side that would keep the arrangement feasible. Null once internal is confirmed. */
    maxWallPerSideIfExternalMm: { L: number; B: number; H: number } | null;
    /** Smallest clearance and where it occurs, with its percentage of that internal dimension. */
    tightest: { axis: Axis; clearanceMm: number; percentOfInternal: number };
  };
  /** Owner-specified (not trialled) arrangement, laid out flat with the tray length along L. Null when none was specified. */
  ownerArrangement: null | { arrangement: { columnsAcrossLength: number; rowsAcrossBreadth: number; levels: number }; required: { L: number; B: number; H: number }; clearanceMm: { L: number; B: number; H: number }; fits: boolean };
  verdict: Verdict;
  openConfirmations: string[];
}

export function assess(spec: CartonPhysicalSpec): FeasibilityReport {
  const cartonMm = spec.cartonInches.map(inchesToMm) as [number, number, number];
  const p = spec.primary; const primaryMm: [number, number, number] = [p.lengthMm, p.breadthMm, p.heightMm];
  const all = orientations(primaryMm).map((o) => fitFor(cartonMm, o));
  const ok = all.filter((f) => f.capacity >= spec.primaryPacksPerCarton);
  let frozen: FeasibilityReport["frozenVisual"] = null;
  const a = spec.frozenVisualArrangement;
  if (a) {
    // Frozen visual: long axis runs into the depth (breadth), short side across the width (length), height vertical.
    const o: Orientation = { alongL: p.breadthMm, alongB: p.lengthMm, alongH: p.heightMm, label: "long axis into depth" };
    const req = { L: a.columnsAcrossLength * o.alongL, B: a.rowsAcrossBreadth * o.alongB, H: a.levels * o.alongH };
    const avail = { L: cartonMm[0], B: cartonMm[1], H: cartonMm[2] };
    const clr = { L: avail.L - req.L, B: avail.B - req.B, H: avail.H - req.H };
    frozen = {
      arrangement: a, orientation: o, required: req, available: avail, clearanceMm: clr,
      fits: clr.L >= -eps && clr.B >= -eps && clr.H >= -eps,
      maxWallPerSideIfExternalMm: spec.dimensionBasis === "internal" ? null : { L: Math.max(0, clr.L / 2), B: Math.max(0, clr.B / 2), H: Math.max(0, clr.H / 2) },
      tightest: (["L", "B", "H"] as Axis[]).map((axis) => ({ axis, clearanceMm: clr[axis], percentOfInternal: (clr[axis] / avail[axis]) * 100 })).reduce((m, c) => (c.clearanceMm < m.clearanceMm ? c : m)),
    };
  }
  let owner: FeasibilityReport["ownerArrangement"] = null;
  const oa = spec.confirmedArrangement;
  if (oa) {
    const req = { L: oa.columnsAcrossLength * p.lengthMm, B: oa.rowsAcrossBreadth * p.breadthMm, H: oa.levels * p.heightMm };
    const clr = { L: cartonMm[0] - req.L, B: cartonMm[1] - req.B, H: cartonMm[2] - req.H };
    owner = { arrangement: oa, required: req, clearanceMm: clr, fits: clr.L >= -eps && clr.B >= -eps && clr.H >= -eps };
  }
  const best = Math.max(...all.map((f) => f.capacity));
  const open: string[] = [];
  if (spec.dimensionBasis !== "internal") open.push("Are the carton dimensions external or internal usable? (unconfirmed)");
  open.push(
    "Does each primary-pack height include the lid? Do lids overhang or nest? (unconfirmed)",
    "Are the primary-pack dimensions measured values (reference listings are approximate)? (unconfirmed)",
    "Flap/closure interference and real packing tolerance on the tightest axis (not measurable from these data)",
  );
  if (spec.configId === "bulk-10") open.push("Effective stacked height of ten closed tray+lid units: lid height and any nesting are unmeasured (no nesting factor assumed)", "Physical pack-and-close trial of the ten-tray stack (not performed)", "40 mm tray option: capacity unverified");
  return {
    configId: spec.configId, label: spec.label, cartonMm, primaryMm, required: spec.primaryPacksPerCarton,
    bestCapacity: best, orientationsThatFit: ok, allOrientations: all,
    frozenVisual: frozen,
    ownerArrangement: owner,
    verdict: !ok.length ? "dimensionally-incompatible" : spec.dimensionBasis === "internal" ? "mathematically-feasible" : "feasible-under-unverified-assumptions",
    openConfirmations: open,
  };
}

/** Whole units that stack within the internal height for a given unit height (no nesting factor assumed). */
export const stackCapacity = (internalHeightMm: number, unitHeightMm: number): number => Math.floor((internalHeightMm + 1e-9) / unitHeightMm);
