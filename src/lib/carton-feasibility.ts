import { inchesToMm, type CartonPhysicalSpec } from "./carton-physical-spec";

/** Pure dimensional audit. Axis-aligned boxes only; no wall thickness, tolerance, lid interference or nesting is invented. */
export type Axis = "L" | "B" | "H";
export interface Orientation { alongL: number; alongB: number; alongH: number; label: string }
export interface Fit { orientation: Orientation; nx: number; ny: number; nz: number; capacity: number; slackMm: { L: number; B: number; H: number } }
export type Verdict = "feasible-under-unverified-assumptions" | "dimensionally-incompatible";

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
    /** If the owner's carton figures are external: largest wall thickness per side that still leaves the arrangement feasible on each axis. */
    maxWallPerSideIfExternalMm: { L: number; B: number; H: number };
  };
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
      maxWallPerSideIfExternalMm: { L: Math.max(0, clr.L / 2), B: Math.max(0, clr.B / 2), H: Math.max(0, clr.H / 2) },
    };
  }
  const best = Math.max(...all.map((f) => f.capacity));
  const open = [
    "Are the carton dimensions external or internal usable? (unconfirmed)",
    "Does the primary-pack height include the lid? Do lids nest or overhang? (unconfirmed)",
    "Corrugated wall/flap thickness and packing tolerance (not supplied; not assumed)",
  ];
  if (spec.configId === "bulk-10") open.push("Effective stacked height of ten closed tray+lid units (no nesting factor assumed)", "Confirm 'RTC1×10' = catalogue entry bulk-10 (Type C)");
  return {
    configId: spec.configId, label: spec.label, cartonMm, primaryMm, required: spec.primaryPacksPerCarton,
    bestCapacity: best, orientationsThatFit: ok, allOrientations: all,
    frozenVisual: frozen,
    verdict: ok.length ? "feasible-under-unverified-assumptions" : "dimensionally-incompatible",
    openConfirmations: open,
  };
}
