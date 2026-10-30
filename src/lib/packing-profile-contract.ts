import type { CartonConfiguration, CartonAssetStatus, SkuPackingProfile } from "@/lib/carton-builder";

/**
 * Fail-closed normaliser for the PROPOSED Core packing-profile contract (v1).
 * See docs/carton-builder/CORE_PACKING_PROFILE_CONTRACT_SPEC.md.
 *
 * Nothing calls this yet: no Core RPC exists. It exists so that, once Core publishes the projection, binding it
 * is a one-line change and every malformed, unapproved or ambiguous row is already rejected. It never throws and
 * never repairs data: a row is either fully valid or rejected with a typed reason.
 */
export const PACKING_CONTRACT_VERSION = 1;

export type PackingContractIssueCode =
  | "NOT_AN_ARRAY"
  | "CONTRACT_VERSION_UNSUPPORTED"
  | "ROW_NOT_AN_OBJECT"
  | "FIELD_INVALID"
  | "NOT_APPROVED"
  | "NOT_EFFECTIVE"
  | "DUPLICATE_CONFIG"
  | "DUPLICATE_PROFILE"
  | "UNSUPPORTED_CONVERSION"
  | "VARIANT_UNSUPPORTED"
  | "ENGINE_RULE_UNSUPPORTED"
  | "RULE_CONFLICT"
  | "NO_VALID_CONFIG";

export interface PackingContractIssue {
  scope: "payload" | "config" | "profile";
  code: PackingContractIssueCode;
  key?: string;
  message: string;
}

export interface NormalizedPackingContract {
  /** True only when at least one configuration and one profile survived validation. */
  available: boolean;
  configs: CartonConfiguration[];
  profiles: Map<string, SkuPackingProfile>;
  issues: PackingContractIssue[];
}

export interface NormalizeOptions {
  asOf?: Date;
  expectedContractVersion?: number;
}

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);
const hasOwn = (row: Row, key: string) => Object.prototype.hasOwnProperty.call(row, key);
const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const posInt = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
const stringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    const t = text(item);
    if (!t) return null;
    out.push(t);
  }
  return out;
};

/** Parses an optional ISO instant: undefined/null => unbounded, invalid => NaN. */
function instant(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !value.trim()) return NaN;
  const t = Date.parse(value);
  return Number.isNaN(t) ? NaN : t;
}

function windowStatus(row: Row, now: number): "ok" | "invalid" | "outside" {
  const from = instant(row.effective_from);
  const until = instant(row.effective_until);
  if (Number.isNaN(from) || Number.isNaN(until)) return "invalid";
  if (from !== null && now < from) return "outside";
  if (until !== null && now > until) return "outside";
  return "ok";
}

const ASSET_STATUSES: readonly CartonAssetStatus[] = ["approved", "pending", "missing"];

function parseConfig(row: Row, now: number, issues: PackingContractIssue[]): CartonConfiguration | null {
  const id = text(row.config_id);
  const key = id ?? "(missing config_id)";
  const reject = (code: PackingContractIssueCode, message: string) => {
    issues.push({ scope: "config", code, key, message });
    return null;
  };
  const version = posInt(row.config_version);
  const label = text(row.label);
  const family = text(row.family);
  const innerPack = text(row.inner_pack);
  const capacity = posInt(row.capacity_slots);
  const groups = stringArray(row.eligible_packing_groups);
  if (!id || version === null || !label || !family || !innerPack || capacity === null || groups === null) {
    return reject("FIELD_INVALID", "A required configuration field is missing or has the wrong type.");
  }
  if (row.approval_status !== "approved") return reject("NOT_APPROVED", "Only approved configurations are accepted.");
  const window = windowStatus(row, now);
  if (window === "invalid") return reject("FIELD_INVALID", "Effective dates are not valid ISO instants.");
  if (window === "outside") return reject("NOT_EFFECTIVE", "Configuration is outside its effective window.");

  const cols = row.slot_columns ?? null;
  const rows = row.slot_rows ?? null;
  let slotArrangement: CartonConfiguration["slotArrangement"] = null;
  if (cols !== null || rows !== null) {
    const c = posInt(cols);
    const r = posInt(rows);
    if (c === null || r === null || c * r !== capacity) {
      return reject("FIELD_INVALID", "Slot arrangement must be two positive integers whose product equals the capacity.");
    }
    slotArrangement = { columns: c, rows: r };
  }

  const rawSets = row.mixable_group_sets ?? [];
  if (!Array.isArray(rawSets)) return reject("FIELD_INVALID", "mixable_group_sets must be an array.");
  const sets: string[][] = [];
  for (const rawSet of rawSets) {
    const set = stringArray(rawSet);
    if (set === null || set.length === 0) return reject("FIELD_INVALID", "Every mixable group set must be a non-empty array of group codes.");
    if (!set.every((g) => groups.includes(g))) {
      return reject("RULE_CONFLICT", "A mixable group is not listed as an eligible packing group.");
    }
    sets.push(set);
  }

  const assetStatus = (typeof row.asset_status === "string" ? row.asset_status : "missing") as CartonAssetStatus;
  if (!ASSET_STATUSES.includes(assetStatus)) return reject("FIELD_INVALID", "asset_status is not recognised.");
  const rawAssets = row.visual_asset_keys ?? null;
  const visualAssets: Record<string, string> = {};
  if (rawAssets !== null) {
    if (!isRow(rawAssets)) return reject("FIELD_INVALID", "visual_asset_keys must be an object.");
    for (const [state, ref] of Object.entries(rawAssets)) {
      const t = text(ref);
      if (!t) return reject("FIELD_INVALID", "Every visual asset reference must be a non-empty string.");
      visualAssets[state] = t;
    }
  }

  const from = instant(row.effective_from);
  const until = instant(row.effective_until);
  return {
    id,
    version,
    label,
    family,
    capacity,
    innerPack,
    active: true,
    effectiveFrom: from === null ? null : (row.effective_from as string),
    effectiveUntil: until === null ? null : (row.effective_until as string),
    eligiblePackingGroups: groups,
    mixablePackingGroupSets: sets,
    slotArrangement,
    visualAssets,
    assetStatus,
  };
}

interface ParsedProfile {
  profile: SkuPackingProfile;
  productId: string;
}

function parseProfile(row: Row, now: number, issues: PackingContractIssue[]): ParsedProfile | null {
  const productId = text(row.product_id);
  const key = productId ?? "(missing product_id)";
  const reject = (code: PackingContractIssueCode, message: string) => {
    issues.push({ scope: "profile", code, key, message });
    return null;
  };
  if (!productId) return reject("FIELD_INVALID", "product_id is missing.");
  if (row.variant_id !== undefined && row.variant_id !== null) {
    return reject("VARIANT_UNSUPPORTED", "Variants are not supported: draft lines are keyed by product only.");
  }
  if (row.conversion_basis !== "slot_unit") {
    return reject("UNSUPPORTED_CONVERSION", "Only the slot_unit conversion is supported.");
  }
  const group = text(row.packing_group);
  const uom = text(row.commercial_uom);
  const slots = posInt(row.slots_per_unit);
  const configIds = stringArray(row.carton_config_ids);
  if (!group || !uom || slots === null || configIds === null || configIds.length === 0 || posInt(row.profile_version) === null) {
    return reject("FIELD_INVALID", "A required profile field is missing or has the wrong type.");
  }
  if (
    typeof row.requires_separate_carton !== "boolean" ||
    typeof row.mix_allowed !== "boolean" ||
    typeof row.full_carton_required !== "boolean"
  ) {
    return reject("FIELD_INVALID", "requires_separate_carton, mix_allowed and full_carton_required must be booleans.");
  }
  if (row.requires_separate_carton && row.mix_allowed) {
    return reject("RULE_CONFLICT", "A SKU that requires a separate carton cannot also allow mixing.");
  }
  if (row.requires_separate_carton || !row.mix_allowed) {
    // The Buyer engine cannot yet keep a SKU exclusive (it would still pack same-group SKUs together).
    return reject(
      "ENGINE_RULE_UNSUPPORTED",
      "Exclusive-carton SKUs are not supported by the Buyer engine yet; the SKU is not carton-managed."
    );
  }
  if (row.approval_status !== "approved") return reject("NOT_APPROVED", "Only approved profiles are accepted.");
  const window = windowStatus(row, now);
  if (window === "invalid") return reject("FIELD_INVALID", "Effective dates are not valid ISO instants.");
  if (window === "outside") return reject("NOT_EFFECTIVE", "Profile is outside its effective window.");

  return { productId, profile: { productId, packingGroup: group, slotsPerUnit: slots, commercialUom: uom, cartonConfigIds: configIds } };
}

const EMPTY = (issues: PackingContractIssue[]): NormalizedPackingContract => ({
  available: false,
  configs: [],
  profiles: new Map(),
  issues,
});

/**
 * Validates raw configuration and profile payloads. Anything wrong with the payload shape or contract version
 * rejects everything; row-level problems reject only that row (or, for duplicates, every row for that key).
 */
export function normalizePackingContract(
  rawConfigs: unknown,
  rawProfiles: unknown,
  options: NormalizeOptions = {}
): NormalizedPackingContract {
  const now = (options.asOf ?? new Date()).getTime();
  const expected = options.expectedContractVersion ?? PACKING_CONTRACT_VERSION;
  const issues: PackingContractIssue[] = [];

  if (!Array.isArray(rawConfigs) || !Array.isArray(rawProfiles)) {
    issues.push({ scope: "payload", code: "NOT_AN_ARRAY", message: "Both payloads must be arrays." });
    return EMPTY(issues);
  }
  for (const row of [...rawConfigs, ...rawProfiles]) {
    if (isRow(row) && hasOwn(row, "contract_version") && row.contract_version !== expected) {
      issues.push({ scope: "payload", code: "CONTRACT_VERSION_UNSUPPORTED", message: "Unknown contract_version; payload rejected." });
      return EMPTY(issues);
    }
    if (isRow(row) && !hasOwn(row, "contract_version")) {
      issues.push({ scope: "payload", code: "CONTRACT_VERSION_UNSUPPORTED", message: "A row has no contract_version; payload rejected." });
      return EMPTY(issues);
    }
  }

  // Configurations
  const seenConfig = new Map<string, number>();
  const parsedConfigs: CartonConfiguration[] = [];
  for (const raw of rawConfigs) {
    if (!isRow(raw)) {
      issues.push({ scope: "config", code: "ROW_NOT_AN_OBJECT", message: "A configuration row is not an object." });
      continue;
    }
    const config = parseConfig(raw, now, issues);
    if (config) {
      const k = `${config.id}@${config.version}`;
      seenConfig.set(k, (seenConfig.get(k) ?? 0) + 1);
      parsedConfigs.push(config);
    }
  }
  const duplicateKeys = new Set([...seenConfig].filter(([, n]) => n > 1).map(([k]) => k));
  for (const k of duplicateKeys) {
    issues.push({ scope: "config", code: "DUPLICATE_CONFIG", key: k, message: "Duplicate configuration id and version; all copies rejected." });
  }
  const configs = parsedConfigs.filter((c) => !duplicateKeys.has(`${c.id}@${c.version}`));
  const knownConfigIds = new Set(configs.map((c) => c.id));

  // Profiles
  const parsed: ParsedProfile[] = [];
  const counts = new Map<string, number>();
  for (const raw of rawProfiles) {
    if (!isRow(raw)) {
      issues.push({ scope: "profile", code: "ROW_NOT_AN_OBJECT", message: "A profile row is not an object." });
      continue;
    }
    const p = parseProfile(raw, now, issues);
    if (p) {
      parsed.push(p);
      counts.set(p.productId, (counts.get(p.productId) ?? 0) + 1);
    }
  }
  const profiles = new Map<string, SkuPackingProfile>();
  const reportedDup = new Set<string>();
  for (const { productId, profile } of parsed) {
    if ((counts.get(productId) ?? 0) > 1) {
      if (!reportedDup.has(productId)) {
        reportedDup.add(productId);
        issues.push({ scope: "profile", code: "DUPLICATE_PROFILE", key: productId, message: "More than one profile for this product; all rejected as ambiguous." });
      }
      continue;
    }
    const usable = profile.cartonConfigIds.filter((id) => knownConfigIds.has(id));
    if (usable.length === 0) {
      issues.push({ scope: "profile", code: "NO_VALID_CONFIG", key: productId, message: "The profile references no valid, approved configuration." });
      continue;
    }
    profiles.set(productId, { ...profile, cartonConfigIds: usable });
  }

  return { available: configs.length > 0 && profiles.size > 0, configs, profiles, issues };
}
