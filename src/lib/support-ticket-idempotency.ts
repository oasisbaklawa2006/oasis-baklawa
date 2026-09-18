import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const STORAGE_KEY = "oasis_buyer_support_ticket_idempotency_v2";

interface SupportTicketRetryRecord {
  key: string;
  fingerprint: string | null;
}

export interface SupportTicketPayload {
  orderId: string;
  issueType: string;
  description: string;
  productSku?: string | null;
  quantityAffected?: number | null;
}

let memoryRecord: SupportTicketRetryRecord | null = null;

export function buildSupportTicketPayloadFingerprint(input: SupportTicketPayload): string {
  return JSON.stringify({
    orderId: input.orderId.trim(),
    issueType: input.issueType.trim().toLowerCase().replace(/\s+/g, "_"),
    description: input.description.trim(),
    productSku: input.productSku?.trim() || null,
    quantityAffected: input.quantityAffected ?? null,
  });
}

function parseStoredRecord(raw: string | null): SupportTicketRetryRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SupportTicketRetryRecord>;
    if (
      typeof parsed.key === "string" &&
      parsed.key.trim().length > 0 &&
      (typeof parsed.fingerprint === "string" || parsed.fingerprint === null)
    ) {
      return { key: parsed.key, fingerprint: parsed.fingerprint };
    }
  } catch {
    // Legacy v1 storage contained only a bare key. It is deliberately not
    // reused because it cannot be proven to belong to the current payload.
  }
  return null;
}

function resolveRecord(
  current: SupportTicketRetryRecord | null,
  fingerprint: string
): { record: SupportTicketRetryRecord; changed: boolean } {
  if (current?.fingerprint === fingerprint) {
    return { record: current, changed: false };
  }
  if (current?.fingerprint === null) {
    return { record: { ...current, fingerprint }, changed: true };
  }
  return {
    record: { key: createIdempotencyKey(), fingerprint },
    changed: true,
  };
}

async function persistBestEffort(record: SupportTicketRetryRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // memoryRecord remains authoritative for this process. The caller can
    // still retry safely even when device storage is temporarily unavailable.
  }
}

/**
 * Returns a retry key bound to the exact ticket payload. A lost/timed-out
 * response may reuse the key only while the payload fingerprint is unchanged;
 * editing order/type/description rotates the key before the next submission.
 */
export async function getSupportTicketIdempotencyKey(fingerprint: string): Promise<string> {
  if (!fingerprint.trim()) {
    throw new Error("support_ticket_payload_fingerprint_required");
  }

  if (memoryRecord) {
    const resolved = resolveRecord(memoryRecord, fingerprint);
    memoryRecord = resolved.record;
    if (resolved.changed) await persistBestEffort(resolved.record);
    return resolved.record.key;
  }

  try {
    const stored = parseStoredRecord(await AsyncStorage.getItem(STORAGE_KEY));
    const resolved = resolveRecord(stored, fingerprint);
    memoryRecord = resolved.record;
    if (resolved.changed) await persistBestEffort(resolved.record);
    return resolved.record.key;
  } catch {
    const resolved = resolveRecord(null, fingerprint);
    memoryRecord = resolved.record;
    return resolved.record.key;
  }
}

/**
 * Rotates the retry key immediately after Core acknowledges the submission.
 * The fresh unbound key is written over the old persisted key; if that write
 * fails, removal is attempted, while memoryRecord still prevents reuse in the
 * current process.
 */
export async function clearSupportTicketIdempotencyKey(): Promise<void> {
  const rotated: SupportTicketRetryRecord = {
    key: createIdempotencyKey(),
    fingerprint: null,
  };
  memoryRecord = rotated;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rotated));
  } catch {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Device storage is unavailable. The in-memory rotated key still makes
      // the just-acknowledged key unreachable for the life of this process.
    }
  }
}

/** Test-only: reset in-memory state between isolated test cases. */
export function resetSupportTicketIdempotencyForTests(): void {
  memoryRecord = null;
}
