/**
 * Buyer-only carton builder: configuration model, validation and physical allocation.
 *
 * Boundaries (frozen business rules):
 * - Physical fullness is NOT commercial validity. MOQ/increment/price live in
 *   buyer-commercial-validation.ts and Core remains authoritative.
 * - Compatibility is never inferred from capacity. A SKU must have an explicit, verified
 *   SkuPackingProfile and the carton configuration must explicitly accept its packing group
 *   (and any group mix). Unknown => fail closed.
 * - Nothing here writes to factory packing, dispatch, DPL, invoicing or Trace state. The
 *   "sealed" state is an illustration only.
 * - Capacities are data. 4/6/10 are only the first configurations, never constants.
 */

export type CartonAssetStatus = "approved" | "pending" | "missing";

export interface CartonSlotArrangement {
  columns: number;
  rows: number;
}

export interface CartonConfiguration {
  /** Stable identifier, unique across the catalogue (e.g. "888x4"). */
  id: string;
  /** Monotonic configuration version; the highest effective active version wins. */
  version: number;
  label: string;
  family: string;
  /** Physical capacity in slots (inner trays/boxes). */
  capacity: number;
  innerPack: string;
  active: boolean;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  /** Packing groups verified to fit this carton. Empty => nothing is eligible (fail closed). */
  eligiblePackingGroups: readonly string[];
  /**
   * Explicit group sets that may share one carton. A carton holding a single group needs no
   * entry; a carton holding several groups must be fully contained in one listed set.
   */
  mixablePackingGroupSets: readonly (readonly string[])[];
  /** Only set when the physical slot layout is verified; otherwise the UI shows a neutral meter. */
  slotArrangement?: CartonSlotArrangement | null;
  /** Visual asset references keyed by CartonVisualKey. Never fabricated; see assetStatus. */
  visualAssets: Readonly<Partial<Record<string, string>>>;
  assetStatus: CartonAssetStatus;
}

/** Verified per-SKU packing facts. Supplied by a governed backend projection, never guessed. */
export interface SkuPackingProfile {
  productId: string;
  packingGroup: string;
  /** Slots one ordered commercial unit occupies. Positive integer. */
  slotsPerUnit: number;
  /** Commercial unit this conversion is valid for; must equal the buyer price UOM. */
  commercialUom: string;
  /** Carton configuration ids this SKU is verified to fit. */
  cartonConfigIds: readonly string[];
}

export interface CartonLine {
  productId: string;
  /** Customer-selected quantity in the SKU's commercial unit. Never altered by this module. */
  quantity: number;
}

export type CartonIssueCode =
  | "CONFIG_INVALID"
  | "CONFIG_INACTIVE"
  | "CONFIG_NOT_EFFECTIVE"
  | "NO_VERIFIED_GROUPS"
  | "PROFILE_MISSING"
  | "PROFILE_INVALID"
  | "SKU_NOT_ELIGIBLE"
  | "GROUP_NOT_ACCEPTED"
  | "MIX_NOT_VERIFIED"
  | "INVALID_QUANTITY"
  | "DUPLICATE_PRODUCT"
  | "CAPACITY_EXCEEDED";

export interface CartonIssue {
  code: CartonIssueCode;
  productId?: string;
  message: string;
}

export interface CartonSkuAllocation {
  productId: string;
  quantity: number;
  slots: number;
}

export type CartonState = "empty" | "partial" | "full" | "sealed-preview" | "invalid";
export type CartonVisualKey = "empty" | "full" | "sealed" | `slot-${number}`;

export interface CartonPreview {
  configId: string;
  configVersion: number;
  capacity: number;
  filledSlots: number;
  remainingSlots: number;
  percentage: number;
  allocations: CartonSkuAllocation[];
  state: CartonState;
  visualKey: CartonVisualKey;
  /** All slots filled and every physical rule passed. Says nothing about MOQ or price. */
  physicallyComplete: boolean;
  /** No physical rule violated (a partial carton can be physically valid). */
  physicallyValid: boolean;
  issues: CartonIssue[];
}

export type ProfileRegistry = ReadonlyMap<string, SkuPackingProfile> | Readonly<Record<string, SkuPackingProfile>>;

export function lookupProfile(registry: ProfileRegistry, productId: string): SkuPackingProfile | undefined {
  if (registry instanceof Map) return registry.get(productId);
  // Own properties only: ids such as "toString" or "__proto__" must never resolve to inherited members.
  const record = registry as Record<string, SkuPackingProfile>;
  return Object.prototype.hasOwnProperty.call(record, productId) ? record[productId] : undefined;
}

/** First three configurations. Deliberately inactive: SKU mappings and 6/10 geometry are unverified. */
export const INITIAL_CARTON_CATALOGUE: readonly CartonConfiguration[] = [
  {
    id: "888x4",
    version: 1,
    label: "Type A — 888×4",
    family: "bulk_sweets",
    capacity: 4,
    innerPack: "tray",
    active: false,
    eligiblePackingGroups: [],
    mixablePackingGroupSets: [],
    slotArrangement: null,
    visualAssets: {},
    assetStatus: "pending",
  },
  {
    id: "bulk-6",
    version: 1,
    label: "Type B — 6 inner boxes",
    family: "bulk_sweets",
    capacity: 6,
    innerPack: "box",
    active: false,
    eligiblePackingGroups: [],
    mixablePackingGroupSets: [],
    slotArrangement: null,
    visualAssets: {},
    assetStatus: "missing",
  },
  {
    id: "bulk-10",
    version: 1,
    label: "Type C — 10 inner trays",
    family: "bulk_sweets",
    capacity: 10,
    innerPack: "tray",
    active: false,
    eligiblePackingGroups: [],
    mixablePackingGroupSets: [],
    slotArrangement: null,
    visualAssets: {},
    assetStatus: "missing",
  },
];

const isPositiveInt = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;

function parseInstant(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? NaN : t;
}

/** Structural validation of one configuration. Returns human-readable problems (empty = valid). */
export function validateCartonConfiguration(config: CartonConfiguration): string[] {
  const problems: string[] = [];
  if (!config.id?.trim()) problems.push("Configuration id is required.");
  if (!isPositiveInt(config.version)) problems.push("Configuration version must be a positive integer.");
  if (!isPositiveInt(config.capacity)) problems.push("Capacity must be a positive whole number of slots.");
  if (config.slotArrangement) {
    const { columns, rows } = config.slotArrangement;
    if (!isPositiveInt(columns) || !isPositiveInt(rows) || columns * rows !== config.capacity) {
      problems.push("Slot arrangement must multiply to the carton capacity.");
    }
  }
  for (const set of config.mixablePackingGroupSets) {
    if (!set.every((group) => config.eligiblePackingGroups.includes(group))) {
      problems.push("Every mixable packing group must also be an eligible packing group.");
    }
  }
  if (Number.isNaN(parseInstant(config.effectiveFrom)) || Number.isNaN(parseInstant(config.effectiveUntil))) {
    problems.push("Effective dates must be valid ISO instants.");
  }
  return problems;
}

/** Catalogue-level validation: unique (id, version) pairs plus per-configuration validity. */
export function validateCartonCatalogue(catalogue: readonly CartonConfiguration[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const config of catalogue) {
    const key = `${config.id}@${config.version}`;
    if (seen.has(key)) problems.push(`Duplicate configuration ${key}.`);
    seen.add(key);
    for (const problem of validateCartonConfiguration(config)) problems.push(`${key}: ${problem}`);
  }
  return problems;
}

export function isConfigurationEffective(config: CartonConfiguration, asOf: Date = new Date()): boolean {
  const from = parseInstant(config.effectiveFrom);
  const until = parseInstant(config.effectiveUntil);
  if (Number.isNaN(from) || Number.isNaN(until)) return false;
  const now = asOf.getTime();
  // Half-open window [from, until): the instant equal to effectiveUntil is already expired.
  return (from === null || now >= from) && (until === null || now < until);
}

/** Highest-version active, effective, structurally valid configuration for an id; null if none. */
export function resolveCartonConfiguration(
  catalogue: readonly CartonConfiguration[],
  id: string,
  asOf: Date = new Date()
): CartonConfiguration | null {
  const candidates = catalogue
    .filter((c) => c.id === id && c.active && isConfigurationEffective(c, asOf) && validateCartonConfiguration(c).length === 0)
    .sort((a, b) => b.version - a.version);
  return candidates[0] ?? null;
}

function visualKeyFor(filled: number, capacity: number, sealed: boolean): CartonVisualKey {
  if (filled <= 0) return "empty";
  if (filled >= capacity) return sealed ? "sealed" : "full";
  return `slot-${filled}`;
}

/**
 * Deterministic physical preview of ONE carton. Pure: output does not depend on input order and
 * customer quantities are never modified.
 */
export function previewCarton(
  config: CartonConfiguration,
  lines: readonly CartonLine[],
  profiles: ProfileRegistry,
  options: { showSealed?: boolean; asOf?: Date } = {}
): CartonPreview {
  const showSealed = options.showSealed ?? true;
  const issues: CartonIssue[] = [];
  const configProblems = validateCartonConfiguration(config);
  if (configProblems.length) issues.push({ code: "CONFIG_INVALID", message: configProblems.join(" ") });
  if (!config.active) issues.push({ code: "CONFIG_INACTIVE", message: "This carton type is not available yet." });
  if (!isConfigurationEffective(config, options.asOf)) {
    issues.push({ code: "CONFIG_NOT_EFFECTIVE", message: "This carton type is not currently in effect." });
  }
  if (config.eligiblePackingGroups.length === 0) {
    issues.push({ code: "NO_VERIFIED_GROUPS", message: "Packing compatibility has not been verified for this carton." });
  }

  const seen = new Set<string>();
  const allocations: CartonSkuAllocation[] = [];
  const groups = new Set<string>();
  let filled = 0;

  for (const line of lines) {
    if (!line.productId) {
      issues.push({ code: "INVALID_QUANTITY", message: "A carton line is missing its product." });
      continue;
    }
    if (seen.has(line.productId)) {
      issues.push({ code: "DUPLICATE_PRODUCT", productId: line.productId, message: "The same product appears twice in this carton." });
      continue;
    }
    seen.add(line.productId);
    if (!isPositiveInt(line.quantity)) {
      issues.push({ code: "INVALID_QUANTITY", productId: line.productId, message: "Carton quantities must be positive whole numbers." });
      continue;
    }
    const profile = lookupProfile(profiles, line.productId);
    if (!profile) {
      issues.push({ code: "PROFILE_MISSING", productId: line.productId, message: "Packing details for this product are not verified yet." });
      continue;
    }
    // Registry keys alone are not authority: a mis-keyed profile must never grant another SKU packing rights.
    if (profile.productId !== line.productId || !profile.packingGroup?.trim() || !isPositiveInt(profile.slotsPerUnit) || !profile.commercialUom?.trim()) {
      issues.push({ code: "PROFILE_INVALID", productId: line.productId, message: "Packing details for this product are incomplete." });
      continue;
    }
    if (!profile.cartonConfigIds.includes(config.id)) {
      issues.push({ code: "SKU_NOT_ELIGIBLE", productId: line.productId, message: "This product is not verified for this carton type." });
      continue;
    }
    if (!config.eligiblePackingGroups.includes(profile.packingGroup)) {
      issues.push({ code: "GROUP_NOT_ACCEPTED", productId: line.productId, message: "This carton type does not accept this product's packing group." });
      continue;
    }
    groups.add(profile.packingGroup);
    const slots = line.quantity * profile.slotsPerUnit;
    allocations.push({ productId: line.productId, quantity: line.quantity, slots });
    filled += slots;
  }

  if (groups.size > 1) {
    const mixOk = config.mixablePackingGroupSets.some((set) => [...groups].every((g) => set.includes(g)));
    if (!mixOk) {
      issues.push({ code: "MIX_NOT_VERIFIED", message: "These products have not been verified to share a carton." });
    }
  }
  if (filled > config.capacity) {
    issues.push({ code: "CAPACITY_EXCEEDED", message: `This carton holds ${config.capacity}; the selection needs ${filled}.` });
  }

  allocations.sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
  const valid = issues.length === 0;
  const capacity = isPositiveInt(config.capacity) ? config.capacity : 0;
  const complete = valid && capacity > 0 && filled === capacity;
  const state: CartonState = !valid
    ? "invalid"
    : complete
      ? showSealed ? "sealed-preview" : "full"
      : filled > 0 ? "partial" : "empty";
  return {
    configId: config.id,
    configVersion: config.version,
    capacity,
    filledSlots: filled,
    remainingSlots: Math.max(0, capacity - filled),
    percentage: capacity ? Math.min(100, (filled / capacity) * 100) : 0,
    allocations,
    state,
    visualKey: visualKeyFor(Math.min(filled, capacity), capacity, complete && showSealed),
    physicallyComplete: complete,
    physicallyValid: valid,
    issues,
  };
}

export interface CartonPlan {
  cartons: CartonPreview[];
  /** Lines that could not be placed because their packing data is missing/unverified. */
  unplaceable: CartonIssue[];
}

/**
 * Deterministically spreads cart lines over as many cartons of one configuration as needed.
 * Lines are placed in a stable order (packing group, then product id) and a line may be split
 * across cartons; customer quantities are never changed. Unverified SKUs are reported, not guessed.
 */
export function planCartons(
  config: CartonConfiguration,
  lines: readonly CartonLine[],
  profiles: ProfileRegistry,
  options: { showSealed?: boolean; asOf?: Date } = {}
): CartonPlan {
  const unplaceable: CartonIssue[] = [];
  const placeable: { line: CartonLine; profile: SkuPackingProfile }[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.productId)) {
      unplaceable.push({ code: "DUPLICATE_PRODUCT", productId: line.productId, message: "The same product appears twice in the cart." });
      continue;
    }
    seen.add(line.productId);
    const profile = lookupProfile(profiles, line.productId);
    const probe = previewCarton(config, [{ productId: line.productId, quantity: 1 }], profiles, options);
    const blocking = probe.issues.find((i) => i.productId === line.productId || i.code === "CONFIG_INACTIVE" || i.code === "CONFIG_INVALID" || i.code === "CONFIG_NOT_EFFECTIVE" || i.code === "NO_VERIFIED_GROUPS");
    if (!profile || blocking || !isPositiveInt(line.quantity)) {
      unplaceable.push(blocking ?? { code: profile ? "INVALID_QUANTITY" : "PROFILE_MISSING", productId: line.productId, message: "This product cannot be placed in a carton yet." });
      continue;
    }
    placeable.push({ line, profile });
  }
  placeable.sort((a, b) =>
    a.profile.packingGroup === b.profile.packingGroup
      ? a.line.productId < b.line.productId ? -1 : 1
      : a.profile.packingGroup < b.profile.packingGroup ? -1 : 1
  );

  const buckets: { lines: CartonLine[]; groups: Set<string>; slots: number }[] = [];
  const canJoin = (groups: Set<string>, group: string) =>
    groups.has(group) || groups.size === 0 ||
    config.mixablePackingGroupSets.some((set) => set.includes(group) && [...groups].every((g) => set.includes(g)));

  for (const { line, profile } of placeable) {
    let unitsLeft = line.quantity;
    while (unitsLeft > 0) {
      let bucket = buckets[buckets.length - 1];
      if (!bucket || bucket.slots >= config.capacity || !canJoin(bucket.groups, profile.packingGroup)) {
        bucket = { lines: [], groups: new Set(), slots: 0 };
        buckets.push(bucket);
      }
      const fit = Math.min(unitsLeft, Math.floor((config.capacity - bucket.slots) / profile.slotsPerUnit));
      if (fit <= 0) {
        // A single unit larger than a whole carton can never be placed.
        if (bucket.slots === 0) {
          // This provisional bucket contains no allocated units. Do not report
          // an empty carton when a single SKU unit cannot fit the configuration.
          buckets.pop();
          unplaceable.push({ code: "CAPACITY_EXCEEDED", productId: line.productId, message: "One unit of this product is larger than a whole carton." });
          break;
        }
        bucket.slots = config.capacity; // close this carton and open another
        continue;
      }
      bucket.lines.push({ productId: line.productId, quantity: fit });
      bucket.groups.add(profile.packingGroup);
      bucket.slots += fit * profile.slotsPerUnit;
      unitsLeft -= fit;
    }
  }
  return { cartons: buckets.map((b) => previewCarton(config, b.lines, profiles, options)), unplaceable };
}

/** Whole units of a SKU that exactly complete a partially filled carton, or null if none can. */
export function unitsToComplete(preview: CartonPreview, profile: SkuPackingProfile): number | null {
  if (!preview.physicallyValid || preview.remainingSlots <= 0) return null;
  return preview.remainingSlots % profile.slotsPerUnit === 0 ? preview.remainingSlots / profile.slotsPerUnit : null;
}
