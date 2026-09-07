import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";
import type { PaymentGatewayPurpose } from "@/types/payment-gateway-contract";

const STORAGE_KEY_PREFIX = "oasis_payment_intent_idempotency_v2:";

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

function storageKeyForOrder(orderId: string, paymentPurpose: PaymentGatewayPurpose): string {
  return `${STORAGE_KEY_PREFIX}${orderId}:${paymentPurpose}`;
}

export interface ResolvedPaymentIdempotency {
  key: string | null;
  reused: boolean;
  persisted: boolean;
}

async function resolvePaymentIdempotencyKeyOnce(
  orderId: string,
  paymentPurpose: PaymentGatewayPurpose,
  storage: PaymentIdempotencyStorage,
  createKey: () => string
): Promise<ResolvedPaymentIdempotency> {
  const storageKey = storageKeyForOrder(orderId, paymentPurpose);
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
  paymentPurpose: PaymentGatewayPurpose = "advance",
  storage: PaymentIdempotencyStorage = asyncStoragePaymentIdempotency,
  createKey: () => string = createIdempotencyKey
): Promise<ResolvedPaymentIdempotency> {
  const inFlightKey = `${orderId}:${paymentPurpose}`;
  const inFlight = inFlightResolutions.get(inFlightKey);
  if (inFlight) return inFlight;

  const promise = resolvePaymentIdempotencyKeyOnce(orderId, paymentPurpose, storage, createKey).finally(() => {
    inFlightResolutions.delete(inFlightKey);
  });
  inFlightResolutions.set(inFlightKey, promise);
  return promise;
}

export async function clearPaymentIdempotencyKey(
  orderId: string,
  paymentPurpose: PaymentGatewayPurpose = "advance",
  storage: PaymentIdempotencyStorage = asyncStoragePaymentIdempotency
): Promise<void> {
  inFlightResolutions.delete(`${orderId}:${paymentPurpose}`);
  await storage.removeItem(storageKeyForOrder(orderId, paymentPurpose));
}
