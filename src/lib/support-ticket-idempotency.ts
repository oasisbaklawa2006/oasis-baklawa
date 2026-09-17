import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const STORAGE_KEY = "oasis_buyer_support_ticket_idempotency_v1";

let fallbackKey: string | null = null;

/**
 * Returns a stable key so a lost/timed-out ticket-submission response can be
 * retried safely without creating a duplicate ticket. Companion to
 * general-query-idempotency.ts, required by Core's
 * submit_customer_support_ticket_v2(p_idempotency_key, ...) -- a new,
 * backward-compatible RPC (branch support-ticket-idempotency-v2) added
 * alongside the original submit_customer_support_ticket_v1, which had no
 * idempotency protection at all beyond this app's own disabled-while-
 * submitting button and remains deployed, unchanged, for any client still
 * on the old signature.
 */
export async function getSupportTicketIdempotencyKey(): Promise<string> {
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

/** Clears the ticket retry key once Core acknowledges the submission. */
export async function clearSupportTicketIdempotencyKey(): Promise<void> {
  fallbackKey = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort cleanup.
  }
}

/** Test-only: reset in-memory fallback between isolated test cases. */
export function resetSupportTicketIdempotencyForTests(): void {
  fallbackKey = null;
}
