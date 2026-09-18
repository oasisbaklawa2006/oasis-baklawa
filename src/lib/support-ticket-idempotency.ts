import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const STORAGE_KEY = "oasis_buyer_support_ticket_idempotency_v2";
const LEGACY_STORAGE_KEY = "oasis_buyer_support_ticket_idempotency_v1";

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

export class SupportTicketRetryReconciliationRequiredError extends Error {
  readonly code = "SUPPORT_TICKET_RETRY_RECONCILIATION_REQUIRED";

  constructor() {
    super(
      "An earlier support-ticket submission may still be unresolved. Check the communication log and contact Oasis support before submitting another ticket."
    );
    this.name = "SupportTicketRetryReconciliationRequiredError";
  }
}

let memoryRecord: SupportTicketRetryRecord | null = null;
let legacyUnknownKey: string | null = null;
let operationTail: Promise<void> = Promise.resolve();

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
      return { key: parsed.key.trim(), fingerprint: parsed.fingerprint };
    }
  } catch {
    // Invalid v2 data is handled fail-closed by initializeFromStorage().
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

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const run = operationTail.then(operation, operation);
  operationTail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function initializeFromStorage(): Promise<void> {
  if (memoryRecord || legacyUnknownKey) return;

  try {
    const [rawV2, rawLegacy] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LEGACY_STORAGE_KEY),
    ]);

    const parsedV2 = parseStoredRecord(rawV2);
    if (parsedV2) {
      memoryRecord = parsedV2;
      return;
    }

    // A non-empty v2 payload that cannot be parsed, or any legacy v1 bare key,
    // has unknown request semantics. Never substitute a new key: doing so could
    // duplicate a ticket whose response was lost before the app upgraded.
    if (rawV2?.trim()) {
      legacyUnknownKey = rawV2.trim();
      return;
    }
    if (rawLegacy?.trim()) {
      legacyUnknownKey = rawLegacy.trim();
    }
  } catch {
    // Storage can be unavailable in a degraded device state. We can still
    // preserve in-process idempotency; serialize() prevents concurrent callers
    // from generating multiple fallback records.
  }
}

async function persistBestEffort(record: SupportTicketRetryRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // memoryRecord remains authoritative for this process.
  }
}

/**
 * Returns a retry key bound to the exact ticket payload. A lost/timed-out
 * response may reuse the key only while the payload fingerprint is unchanged.
 * Legacy v1 bare keys are intentionally blocked because their original payload
 * cannot be reconstructed safely after an app upgrade.
 */
export function getSupportTicketIdempotencyKey(fingerprint: string): Promise<string> {
  if (!fingerprint.trim()) {
    return Promise.reject(new Error("support_ticket_payload_fingerprint_required"));
  }

  return serialize(async () => {
    await initializeFromStorage();

    if (legacyUnknownKey) {
      throw new SupportTicketRetryReconciliationRequiredError();
    }

    const resolved = resolveRecord(memoryRecord, fingerprint);
    memoryRecord = resolved.record;
    if (resolved.changed) await persistBestEffort(resolved.record);
    return resolved.record.key;
  });
}

/**
 * Rotates the retry key immediately after Core acknowledges the submission.
 * The fresh unbound key replaces the acknowledged key. If device storage is
 * temporarily unavailable, the new in-memory record remains authoritative for
 * this process and the old persisted key is removed when possible.
 */
export function clearSupportTicketIdempotencyKey(): Promise<void> {
  return serialize(async () => {
    const rotated: SupportTicketRetryRecord = {
      key: createIdempotencyKey(),
      fingerprint: null,
    };
    memoryRecord = rotated;
    legacyUnknownKey = null;

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rotated));
    } catch {
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage is unavailable. The in-memory rotated record still makes
        // the acknowledged key unreachable for the lifetime of this process.
      }
    }

    // A successful v2 acknowledgement makes any pre-v2 residue irrelevant.
    try {
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Best effort only; a valid v2 record takes precedence on next startup.
    }
  });
}

export function isSupportTicketRetryReconciliationRequired(
  error: unknown
): error is SupportTicketRetryReconciliationRequiredError {
  return error instanceof SupportTicketRetryReconciliationRequiredError;
}

/** Test-only: reset in-memory/serialized state between isolated test cases. */
export function resetSupportTicketIdempotencyForTests(): void {
  memoryRecord = null;
  legacyUnknownKey = null;
  operationTail = Promise.resolve();
}
