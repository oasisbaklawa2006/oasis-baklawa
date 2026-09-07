import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const REQUEST_STORAGE_KEY = "oasis_buyer_quote_request_idempotency_v1";
const ACCEPT_STORAGE_KEY = "oasis_buyer_quote_accept_idempotency_v1";
const DECLINE_STORAGE_KEY = "oasis_buyer_quote_decline_idempotency_v1";

let requestFallbackKey: string | null = null;
const acceptFallbackKeys = new Map<string, string>();
const declineFallbackKeys = new Map<string, string>();

async function readOrCreateKey(storageKey: string, fallback: string | null, setFallback: (value: string) => string): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(storageKey);
    if (existing && existing.trim().length > 0) return existing;
    const generated = createIdempotencyKey();
    await AsyncStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    if (fallback) return fallback;
    return setFallback(createIdempotencyKey());
  }
}

/** Returns a stable key so a lost quotation-request response can be retried safely. */
export async function getQuoteRequestIdempotencyKey(): Promise<string> {
  return readOrCreateKey(REQUEST_STORAGE_KEY, requestFallbackKey, (key) => {
    requestFallbackKey ??= key;
    return requestFallbackKey;
  });
}

/** Clears the quotation-request retry key once Core acknowledges the submission. */
export async function clearQuoteRequestIdempotencyKey(): Promise<void> {
  requestFallbackKey = null;
  try {
    await AsyncStorage.removeItem(REQUEST_STORAGE_KEY);
  } catch {
    // Best-effort cleanup.
  }
}

/** Returns a stable key so a lost quotation-acceptance response can be retried safely. */
export async function getQuoteAcceptIdempotencyKey(quotationId: string): Promise<string> {
  const storageKey = `${ACCEPT_STORAGE_KEY}:${quotationId}`;
  const existing = acceptFallbackKeys.get(quotationId) ?? null;
  return readOrCreateKey(storageKey, existing, (key) => {
    acceptFallbackKeys.set(quotationId, key);
    return key;
  });
}

/** Clears the quotation-acceptance retry key once Core acknowledges the handoff. */
export async function clearQuoteAcceptIdempotencyKey(quotationId: string): Promise<void> {
  acceptFallbackKeys.delete(quotationId);
  try {
    await AsyncStorage.removeItem(`${ACCEPT_STORAGE_KEY}:${quotationId}`);
  } catch {
    // Best-effort cleanup.
  }
}

/** Returns a stable key so a lost quotation-decline response can be retried safely. */
export async function getQuoteDeclineIdempotencyKey(quotationId: string): Promise<string> {
  const storageKey = `${DECLINE_STORAGE_KEY}:${quotationId}`;
  const existing = declineFallbackKeys.get(quotationId) ?? null;
  return readOrCreateKey(storageKey, existing, (key) => {
    declineFallbackKeys.set(quotationId, key);
    return key;
  });
}

/** Clears the quotation-decline retry key once Core acknowledges the decline. */
export async function clearQuoteDeclineIdempotencyKey(quotationId: string): Promise<void> {
  declineFallbackKeys.delete(quotationId);
  try {
    await AsyncStorage.removeItem(`${DECLINE_STORAGE_KEY}:${quotationId}`);
  } catch {
    // Best-effort cleanup.
  }
}

/** Test-only: reset in-memory fallback between isolated test cases. */
export function resetQuoteIdempotencyForTests(): void {
  requestFallbackKey = null;
  acceptFallbackKeys.clear();
  declineFallbackKeys.clear();
}
