import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "oasis_genie_draft_line_commit_v1";

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

let storage: GenieDraftCommitStorage = AsyncStorage;

export function setGenieDraftCommitStorageForTests(next: GenieDraftCommitStorage | null): void {
  storage = next ?? AsyncStorage;
}

export function genieDraftCommitSignature(line: GenieResolvedCommitLine): string {
  return `${line.lineId}:${line.productId}:${line.normalizedQuantity}`;
}

async function readCommittedSignatures(): Promise<Set<string>> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

async function writeCommittedSignatures(signatures: Set<string>): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify([...signatures]));
}

export async function isGenieDraftLineCommitted(line: GenieResolvedCommitLine): Promise<boolean> {
  const committed = await readCommittedSignatures();
  return committed.has(genieDraftCommitSignature(line));
}

export async function markGenieDraftLineCommitted(line: GenieResolvedCommitLine): Promise<void> {
  const committed = await readCommittedSignatures();
  committed.add(genieDraftCommitSignature(line));
  await writeCommittedSignatures(committed);
}

export async function clearGenieDraftLineCommit(lineId: string): Promise<void> {
  const committed = await readCommittedSignatures();
  for (const signature of committed) {
    if (signature.startsWith(`${lineId}:`)) {
      committed.delete(signature);
    }
  }
  await writeCommittedSignatures(committed);
}

export async function clearGenieDraftLineCommits(): Promise<void> {
  await storage.removeItem(STORAGE_KEY);
}

export function resetGenieDraftLineCommitForTests(): void {
  storage = AsyncStorage;
}
