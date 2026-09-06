import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const REQUEST_STORAGE_KEY = "oasis_buyer_quote_request_idempotency_v1";
const ACCEPT_STORAGE_KEY = "oasis_buyer_quote_accept_idempotency_v1";

let requestFallbackKey: string | null = null;
const acceptFallbackKeys = new Map<string, string>();

/** Returns a stable key so a lost quotation-request response can be retried safely. */
export async function getQuoteRequestIdempotencyKey(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(REQUEST_STORAGE_KEY);
    if (existing && existing.trim().length > 0) return existing;
    const generated = createIdempotencyKey();
    await AsyncStorage.setItem(REQUEST_STORAGE_KEY, generated);
    return generated;
  } catch {
    requestFallbackKey ??= createIdempotencyKey();
    return requestFallbackKey;
  }
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
  try {
    const existing = await AsyncStorage.getItem(storageKey);
    if (existing && existing.trim().length > 0) return existing;
    const generated = createIdempotencyKey();
    await AsyncStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    const existing = acceptFallbackKeys.get(quotationId);
    if (existing) return existing;
    const generated = createIdempotencyKey();
    acceptFallbackKeys.set(quotationId, generated);
    return generated;
  }
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

/** Test-only: reset in-memory fallback between isolated test cases. */
export function resetQuoteIdempotencyForTests(): void {
  requestFallbackKey = null;
  acceptFallbackKeys.clear();
}
