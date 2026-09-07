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

export interface GenieDraftLineCommitRecord extends GenieResolvedCommitLine {
  draftLineId: string;
}

export interface GenieDraftLineWriter {
  add(productId: string, quantity: number): Promise<string>;
  update(draftLineId: string, quantity: number): Promise<void>;
  remove(draftLineId: string): Promise<void>;
}

let storage: GenieDraftCommitStorage = AsyncStorage;

export function setGenieDraftCommitStorageForTests(next: GenieDraftCommitStorage | null): void {
  storage = next ?? AsyncStorage;
}

export function genieDraftCommitSignature(line: GenieResolvedCommitLine): string {
  return `${line.lineId}:${line.productId}:${line.normalizedQuantity}`;
}

function isRecord(value: unknown): value is GenieDraftLineCommitRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<GenieDraftLineCommitRecord>;
  return (
    typeof record.lineId === "string" &&
    typeof record.draftLineId === "string" &&
    typeof record.productId === "string" &&
    typeof record.normalizedQuantity === "number"
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

export async function isGenieDraftLineCommitted(line: GenieResolvedCommitLine): Promise<boolean> {
  const existing = findCommitRecord(await readCommitRecords(), line.lineId);
  if (!existing) return false;
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

    await draftWriter.remove(existing.draftLineId);
    const draftLineId = await draftWriter.add(line.productId, line.normalizedQuantity);
    await writeCommitRecords(
      upsertCommitRecord(records, {
        ...line,
        draftLineId,
      })
    );
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
