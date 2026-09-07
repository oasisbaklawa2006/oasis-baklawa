import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "oasis_genie_draft_line_commit_v2";

export interface GenieDraftCommitStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface GenieResolvedCommitLine {
  lineId: string;
  productId: string;
  normalizedQuantity: number;
}

export interface GenieDraftLinePendingReplacement {
  targetProductId: string;
  targetQuantity: number;
  oldDraftLineRemoved?: boolean;
  /** Set when add succeeded remotely but durable commit mapping write failed. */
  newDraftLineId?: string;
}

export interface GenieDraftLineCommitRecord extends GenieResolvedCommitLine {
  draftLineId: string;
  pendingReplacement?: GenieDraftLinePendingReplacement;
}

export interface GenieDraftLineWriter {
  add(productId: string, quantity: number): Promise<string>;
  update(draftLineId: string, quantity: number): Promise<void>;
  remove(draftLineId: string): Promise<void>;
  /** Locate an orphaned replacement draft line after an ambiguous add failure. */
  findReplacementDraftLineId?(productId: string, quantity: number): Promise<string | null>;
}

let storage: GenieDraftCommitStorage = AsyncStorage;

export function setGenieDraftCommitStorageForTests(next: GenieDraftCommitStorage | null): void {
  storage = next ?? AsyncStorage;
}

export function genieDraftCommitSignature(line: GenieResolvedCommitLine): string {
  return `${line.lineId}:${line.productId}:${line.normalizedQuantity}`;
}

function isPendingReplacement(value: unknown): value is GenieDraftLinePendingReplacement {
  if (!value || typeof value !== "object") return false;
  const pending = value as Partial<GenieDraftLinePendingReplacement>;
  return typeof pending.targetProductId === "string" && typeof pending.targetQuantity === "number";
}

function isRecord(value: unknown): value is GenieDraftLineCommitRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<GenieDraftLineCommitRecord>;
  return (
    typeof record.lineId === "string" &&
    typeof record.draftLineId === "string" &&
    typeof record.productId === "string" &&
    typeof record.normalizedQuantity === "number" &&
    (record.pendingReplacement === undefined || isPendingReplacement(record.pendingReplacement))
  );
}

async function readCommitRecords(): Promise<GenieDraftLineCommitRecord[]> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord);
  } catch {
    return [];
  }
}

async function writeCommitRecords(records: GenieDraftLineCommitRecord[]): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function findCommitRecord(
  records: GenieDraftLineCommitRecord[],
  lineId: string
): GenieDraftLineCommitRecord | undefined {
  return records.find((record) => record.lineId === lineId);
}

function upsertCommitRecord(
  records: GenieDraftLineCommitRecord[],
  next: GenieDraftLineCommitRecord
): GenieDraftLineCommitRecord[] {
  const withoutLine = records.filter((record) => record.lineId !== next.lineId);
  return [...withoutLine, next];
}

function pendingMatchesLine(
  pending: GenieDraftLinePendingReplacement,
  line: GenieResolvedCommitLine
): boolean {
  return pending.targetProductId === line.productId && pending.targetQuantity === line.normalizedQuantity;
}

async function finalizeProductReplacement(
  records: GenieDraftLineCommitRecord[],
  line: GenieResolvedCommitLine,
  draftLineId: string
): Promise<void> {
  await writeCommitRecords(
    upsertCommitRecord(records, {
      lineId: line.lineId,
      productId: line.productId,
      normalizedQuantity: line.normalizedQuantity,
      draftLineId,
    })
  );
}

async function persistPendingReplacement(
  records: GenieDraftLineCommitRecord[],
  existing: GenieDraftLineCommitRecord,
  pendingReplacement: GenieDraftLinePendingReplacement
): Promise<GenieDraftLineCommitRecord[]> {
  const nextRecords = upsertCommitRecord(records, {
    ...existing,
    pendingReplacement,
  });
  await writeCommitRecords(nextRecords);
  return nextRecords;
}

async function reconcileReplacementDraftLineId(
  line: GenieResolvedCommitLine,
  draftWriter: GenieDraftLineWriter
): Promise<string | null> {
  if (!draftWriter.findReplacementDraftLineId) return null;
  return draftWriter.findReplacementDraftLineId(line.productId, line.normalizedQuantity);
}

async function reconcilePendingProductReplacement(
  line: GenieResolvedCommitLine,
  existing: GenieDraftLineCommitRecord,
  draftWriter: GenieDraftLineWriter,
  records: GenieDraftLineCommitRecord[]
): Promise<boolean> {
  const pending = existing.pendingReplacement;
  if (!pending || !pendingMatchesLine(pending, line)) return false;

  if (pending.newDraftLineId) {
    await finalizeProductReplacement(records, line, pending.newDraftLineId);
    return true;
  }

  if (pending.oldDraftLineRemoved) {
    const reconciled = await reconcileReplacementDraftLineId(line, draftWriter);
    if (reconciled) {
      await finalizeProductReplacement(records, line, reconciled);
      return true;
    }

    const draftLineId = await draftWriter.add(line.productId, line.normalizedQuantity);
    const currentRecords = await readCommitRecords();
    const current = findCommitRecord(currentRecords, line.lineId);
    if (current?.pendingReplacement) {
      await persistPendingReplacement(currentRecords, current, {
        ...current.pendingReplacement,
        newDraftLineId: draftLineId,
      });
    }
    await finalizeProductReplacement(await readCommitRecords(), line, draftLineId);
    return true;
  }

  return false;
}

async function commitProductReplacement(
  line: GenieResolvedCommitLine,
  existing: GenieDraftLineCommitRecord,
  draftWriter: GenieDraftLineWriter,
  records: GenieDraftLineCommitRecord[]
): Promise<void> {
  const pendingReplacement: GenieDraftLinePendingReplacement = {
    targetProductId: line.productId,
    targetQuantity: line.normalizedQuantity,
  };

  let currentRecords = await persistPendingReplacement(records, existing, pendingReplacement);

  await draftWriter.remove(existing.draftLineId);
  const afterRemove = findCommitRecord(currentRecords, line.lineId) ?? existing;
  currentRecords = await persistPendingReplacement(currentRecords, afterRemove, {
    ...pendingReplacement,
    oldDraftLineRemoved: true,
  });

  let draftLineId: string;
  try {
    draftLineId = await draftWriter.add(line.productId, line.normalizedQuantity);
  } catch (error) {
    const reconciled = await reconcileReplacementDraftLineId(line, draftWriter);
    if (reconciled) {
      await finalizeProductReplacement(await readCommitRecords(), line, reconciled);
      return;
    }
    throw error;
  }

  const beforeFinalize = findCommitRecord(await readCommitRecords(), line.lineId);
  if (beforeFinalize?.pendingReplacement) {
    currentRecords = await persistPendingReplacement(await readCommitRecords(), beforeFinalize, {
      ...beforeFinalize.pendingReplacement,
      newDraftLineId: draftLineId,
    });
  }

  await finalizeProductReplacement(currentRecords, line, draftLineId);
}

export async function isGenieDraftLineCommitted(line: GenieResolvedCommitLine): Promise<boolean> {
  const existing = findCommitRecord(await readCommitRecords(), line.lineId);
  if (!existing) return false;
  if (existing.pendingReplacement) return false;
  return (
    existing.productId === line.productId &&
    existing.normalizedQuantity === line.normalizedQuantity
  );
}

export async function commitGenieResolvedLineToDraft(
  line: GenieResolvedCommitLine,
  draftWriter: GenieDraftLineWriter
): Promise<void> {
  const records = await readCommitRecords();
  const existing = findCommitRecord(records, line.lineId);

  if (
    existing &&
    !existing.pendingReplacement &&
    existing.productId === line.productId &&
    existing.normalizedQuantity === line.normalizedQuantity
  ) {
    return;
  }

  if (existing) {
    if (existing.productId === line.productId) {
      await draftWriter.update(existing.draftLineId, line.normalizedQuantity);
      await writeCommitRecords(
        upsertCommitRecord(records, {
          ...line,
          draftLineId: existing.draftLineId,
        })
      );
      return;
    }

    if (await reconcilePendingProductReplacement(line, existing, draftWriter, records)) {
      return;
    }

    await commitProductReplacement(line, existing, draftWriter, records);
    return;
  }

  const draftLineId = await draftWriter.add(line.productId, line.normalizedQuantity);
  await writeCommitRecords(
    upsertCommitRecord(records, {
      ...line,
      draftLineId,
    })
  );
}

export async function clearGenieDraftLineCommits(): Promise<void> {
  await storage.removeItem(STORAGE_KEY);
}

export function resetGenieDraftLineCommitForTests(): void {
  storage = AsyncStorage;
}
