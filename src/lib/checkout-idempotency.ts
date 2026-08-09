import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const STORAGE_KEY_PREFIX = "oasis_checkout_idempotency_v1:";

export interface CheckoutIdempotencyStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const asyncStorageCheckoutIdempotency: CheckoutIdempotencyStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const inFlightResolutions = new Map<string, Promise<ResolvedCheckoutIdempotency>>();

function storageKeyForDraft(draftId: string): string {
  return `${STORAGE_KEY_PREFIX}${draftId}`;
}

export interface ResolvedCheckoutIdempotency {
  key: string | null;
  reused: boolean;
  /** True only when the key is durably stored and safe for order submission. */
  persisted: boolean;
}

async function resolveCheckoutIdempotencyKeyOnce(
  draftId: string,
  storage: CheckoutIdempotencyStorage,
  createKey: () => string
): Promise<ResolvedCheckoutIdempotency> {
  const storageKey = storageKeyForDraft(draftId);

  try {
    const existing = await storage.getItem(storageKey);
    if (existing && existing.trim().length > 0) {
      return { key: existing, reused: true, persisted: true };
    }

    const key = createKey();
    await storage.setItem(storageKey, key);
    return { key, reused: false, persisted: true };
  } catch {
    return { key: null, reused: false, persisted: false };
  }
}

/**
 * Load or create a checkout idempotency key bound to the authoritative draft_id.
 * Concurrent callers for the same draft share a single in-flight resolution.
 */
export async function resolveCheckoutIdempotencyKey(
  draftId: string,
  storage: CheckoutIdempotencyStorage = asyncStorageCheckoutIdempotency,
  createKey: () => string = createIdempotencyKey
): Promise<ResolvedCheckoutIdempotency> {
  const inflight = inFlightResolutions.get(draftId);
  if (inflight) {
    return inflight;
  }

  const resolution = resolveCheckoutIdempotencyKeyOnce(draftId, storage, createKey).finally(() => {
    inFlightResolutions.delete(draftId);
  });

  inFlightResolutions.set(draftId, resolution);
  return resolution;
}

/** Clear persisted key only after confirmed successful or idempotent order submission. */
export async function clearCheckoutIdempotencyKey(
  draftId: string,
  storage: CheckoutIdempotencyStorage = asyncStorageCheckoutIdempotency
): Promise<void> {
  try {
    await storage.removeItem(storageKeyForDraft(draftId));
  } catch {
    // Best-effort cleanup; stale keys for promoted drafts are harmless server-side.
  }
}

/** Test-only: reset in-flight map between isolated test cases. */
export function resetCheckoutIdempotencyInFlightForTests(): void {
  inFlightResolutions.clear();
}
