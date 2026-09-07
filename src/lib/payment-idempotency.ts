import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const STORAGE_KEY_PREFIX = "oasis_payment_intent_idempotency_v1:";

export interface PaymentIdempotencyStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const asyncStoragePaymentIdempotency: PaymentIdempotencyStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const inFlightResolutions = new Map<string, Promise<ResolvedPaymentIdempotency>>();

function storageKeyForOrder(orderId: string): string {
  return `${STORAGE_KEY_PREFIX}${orderId}`;
}

export interface ResolvedPaymentIdempotency {
  key: string | null;
  reused: boolean;
  persisted: boolean;
}

async function resolvePaymentIdempotencyKeyOnce(
  orderId: string,
  storage: PaymentIdempotencyStorage,
  createKey: () => string
): Promise<ResolvedPaymentIdempotency> {
  const storageKey = storageKeyForOrder(orderId);
  try {
    const existing = await storage.getItem(storageKey);
    if (existing?.trim()) {
      return { key: existing, reused: true, persisted: true };
    }
    const key = createKey();
    await storage.setItem(storageKey, key);
    return { key, reused: false, persisted: true };
  } catch {
    return { key: null, reused: false, persisted: false };
  }
}

export async function resolvePaymentIdempotencyKey(
  orderId: string,
  storage: PaymentIdempotencyStorage = asyncStoragePaymentIdempotency,
  createKey: () => string = createIdempotencyKey
): Promise<ResolvedPaymentIdempotency> {
  const inFlight = inFlightResolutions.get(orderId);
  if (inFlight) return inFlight;

  const promise = resolvePaymentIdempotencyKeyOnce(orderId, storage, createKey).finally(() => {
    inFlightResolutions.delete(orderId);
  });
  inFlightResolutions.set(orderId, promise);
  return promise;
}

export async function clearPaymentIdempotencyKey(
  orderId: string,
  storage: PaymentIdempotencyStorage = asyncStoragePaymentIdempotency
): Promise<void> {
  inFlightResolutions.delete(orderId);
  await storage.removeItem(storageKeyForOrder(orderId));
}
