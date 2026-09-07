import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const REQUEST_STORAGE_KEY = "oasis_buyer_quote_request_idempotency_v1";
const ACCEPT_STORAGE_KEY = "oasis_buyer_quote_accept_idempotency_v1";
const DECLINE_STORAGE_KEY = "oasis_buyer_quote_decline_idempotency_v1";

export type QuoteIdempotencyStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export interface ResolvedQuoteIdempotency {
  key: string | null;
  persisted: boolean;
}

let storage: QuoteIdempotencyStorage = AsyncStorage;

const inFlightKeyResolutions = new Map<string, Promise<ResolvedQuoteIdempotency>>();

/** Test-only: inject in-memory storage to simulate AsyncStorage failures. */
export function setQuoteIdempotencyStorageForTests(next: QuoteIdempotencyStorage | null): void {
  storage = next ?? AsyncStorage;
}

async function readOrCreateKeyOnce(
  storageKey: string
): Promise<ResolvedQuoteIdempotency> {
  try {
    const existing = await storage.getItem(storageKey);
    if (existing?.trim()) {
      return { key: existing, persisted: true };
    }
    const generated = createIdempotencyKey();
    await storage.setItem(storageKey, generated);
    return { key: generated, persisted: true };
  } catch {
    return { key: null, persisted: false };
  }
}

async function readOrCreateKey(storageKey: string): Promise<ResolvedQuoteIdempotency> {
  const inflight = inFlightKeyResolutions.get(storageKey);
  if (inflight) return inflight;

  const resolution = readOrCreateKeyOnce(storageKey).finally(() => {
    inFlightKeyResolutions.delete(storageKey);
  });

  inFlightKeyResolutions.set(storageKey, resolution);
  return resolution;
}

/** Rotate to a fresh key after Core acknowledgement; best-effort replace persisted value. */
async function rotateKeyAfterAcknowledgement(storageKey: string): Promise<ResolvedQuoteIdempotency> {
  inFlightKeyResolutions.delete(storageKey);
  const rotated = createIdempotencyKey();
  try {
    await storage.setItem(storageKey, rotated);
    return { key: rotated, persisted: true };
  } catch {
    return { key: null, persisted: false };
  }
}

/** Returns a stable key so a lost quotation-request response can be retried safely. */
export async function getQuoteRequestIdempotencyKey(): Promise<ResolvedQuoteIdempotency> {
  return readOrCreateKey(REQUEST_STORAGE_KEY);
}

/** Clears the quotation-request retry key once Core acknowledges the submission. */
export async function clearQuoteRequestIdempotencyKey(): Promise<ResolvedQuoteIdempotency> {
  return rotateKeyAfterAcknowledgement(REQUEST_STORAGE_KEY);
}

/** Returns a stable key so a lost quotation-acceptance response can be retried safely. */
export async function getQuoteAcceptIdempotencyKey(quotationId: string): Promise<ResolvedQuoteIdempotency> {
  return readOrCreateKey(`${ACCEPT_STORAGE_KEY}:${quotationId}`);
}

/** Clears the quotation-acceptance retry key once Core acknowledges the handoff. */
export async function clearQuoteAcceptIdempotencyKey(quotationId: string): Promise<ResolvedQuoteIdempotency> {
  return rotateKeyAfterAcknowledgement(`${ACCEPT_STORAGE_KEY}:${quotationId}`);
}

/** Returns a stable key so a lost quotation-decline response can be retried safely. */
export async function getQuoteDeclineIdempotencyKey(quotationId: string): Promise<ResolvedQuoteIdempotency> {
  return readOrCreateKey(`${DECLINE_STORAGE_KEY}:${quotationId}`);
}

/** Clears the quotation-decline retry key once Core acknowledges the decline. */
export async function clearQuoteDeclineIdempotencyKey(quotationId: string): Promise<ResolvedQuoteIdempotency> {
  return rotateKeyAfterAcknowledgement(`${DECLINE_STORAGE_KEY}:${quotationId}`);
}

/** Test-only: reset in-flight resolution between isolated test cases. */
export function resetQuoteIdempotencyForTests(): void {
  inFlightKeyResolutions.clear();
  storage = AsyncStorage;
}
