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

function storageKeyForDraft(draftId: string): string {
  return `${STORAGE_KEY_PREFIX}${draftId}`;
}

export interface ResolvedCheckoutIdempotency {
  key: string;
  reused: boolean;
  storageError: boolean;
}

/**
 * Load or create a checkout idempotency key bound to the authoritative draft_id.
 * A new draft never inherits a key stored for a different draft_id.
 */
export async function resolveCheckoutIdempotencyKey(
  draftId: string,
  storage: CheckoutIdempotencyStorage = asyncStorageCheckoutIdempotency,
  createKey: () => string = createIdempotencyKey
): Promise<ResolvedCheckoutIdempotency> {
  const storageKey = storageKeyForDraft(draftId);

  try {
    const existing = await storage.getItem(storageKey);
    if (existing && existing.trim().length > 0) {
      return { key: existing, reused: true, storageError: false };
    }

    const key = createKey();
    await storage.setItem(storageKey, key);
    return { key, reused: false, storageError: false };
  } catch {
    const fallbackKey = createKey();
    return { key: fallbackKey, reused: false, storageError: true };
  }
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
