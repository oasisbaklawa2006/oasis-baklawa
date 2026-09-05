import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const STORAGE_KEY = "oasis_buyer_general_query_idempotency_v1";

let fallbackKey: string | null = null;

/** Returns a stable key so a lost general-query response can be retried safely. */
export async function getGeneralQueryIdempotencyKey(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing && existing.trim().length > 0) return existing;
    const generated = createIdempotencyKey();
    await AsyncStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    fallbackKey ??= createIdempotencyKey();
    return fallbackKey;
  }
}

/** Clears the general-query retry key once Core acknowledges the submission. */
export async function clearGeneralQueryIdempotencyKey(): Promise<void> {
  fallbackKey = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort cleanup.
  }
}

/** Test-only: reset in-memory fallback between isolated test cases. */
export function resetGeneralQueryIdempotencyForTests(): void {
  fallbackKey = null;
}
