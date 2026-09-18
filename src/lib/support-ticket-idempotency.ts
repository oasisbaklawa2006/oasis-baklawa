import AsyncStorage from "@react-native-async-storage/async-storage";
import { createIdempotencyKey } from "@/lib/idempotency";

const STORAGE_KEY = "oasis_buyer_support_ticket_idempotency_v2";
const LEGACY_STORAGE_KEY = "oasis_buyer_support_ticket_idempotency_v1";

type RetryRecordState = "ready" | "legacy_unknown";

interface SupportTicketRetryRecord {
  key: string;
  fingerprint: string | null;
  state: RetryRecordState;
}

export interface SupportTicketPayload {
  orderId: string;
  issueType: string;
  description: string;
  productSku?: string | null;
  quantityAffected?: number | null;
}

let memoryRecord: SupportTicketRetryRecord | null = null;
let operationChain: Promise<void> = Promise.resolve();

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
  if (!raw?.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SupportTicketRetryRecord>;
    if (
      typeof parsed.key === "string" &&
      parsed.key.trim().length > 0 &&
      (typeof parsed.fingerprint === "string" || parsed.fingerprint === null)
    ) {
      return {
        key: parsed.key,
        fingerprint: parsed.fingerprint,
        state: parsed.state === "legacy_unknown" ? "legacy_unknown" : "ready",
      };
    }
  } catch {
    // A historical v1 record was a bare idempotency key. Preserve it as an
    // unknown-outcome retry state; never silently substitute a new key.
    return {
      key: raw.trim(),
      fingerprint: null,
      state: "legacy_unknown",
    };
  }

  return null;
}

function resolveRecord(
  current: SupportTicketRetryRecord | null,
  fingerprint: string
): { record: SupportTicketRetryRecord; changed: boolean } {
  if (current?.state === "legacy_unknown") {
    return { record: current, changed: false };
  }
  if (current?.fingerprint === fingerprint) {
    return { record: current, changed: false };
  }
  if (current?.fingerprint === null) {
    return {
      record: { ...current, fingerprint, state: "ready" },
      changed: true,
    };
  }
  return {
    record: {
      key: createIdempotencyKey(),
      fingerprint,
      state: "ready",
    },
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

async function loadInitialRecord(): Promise<SupportTicketRetryRecord | null> {
  try {
    const current = parseStoredRecord(await AsyncStorage.getItem(STORAGE_KEY));
    if (current) return current;

    const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw?.trim()) {
      const legacy: SupportTicketRetryRecord = {
        key: legacyRaw.trim(),
        fingerprint: null,
        state: "legacy_unknown",
      };
      await persistBestEffort(legacy);
      return legacy;
    }
  } catch {
    // Fall through to an in-memory retry record only when there is no durable
    // legacy state available to preserve.
  }
  return null;
}

function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationChain.then(operation, operation);
  operationChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export class SupportTicketRetryOutcomeUnknownError extends Error {
  constructor() {
    super("support_ticket_retry_outcome_unknown");
    this.name = "SupportTicketRetryOutcomeUnknownError";
  }
}

export function isSupportTicketRetryOutcomeUnknownError(
  error: unknown
): error is SupportTicketRetryOutcomeUnknownError {
  return (
    error instanceof SupportTicketRetryOutcomeUnknownError ||
    (error instanceof Error && error.message === "support_ticket_retry_outcome_unknown")
  );
}

/**
 * Returns a retry key bound to the exact ticket payload. All storage reads,
 * record resolution and persistence are serialized so cold-start concurrent
 * callers cannot generate competing keys.
 *
 * Historical v1 bare keys are quarantined as unknown-outcome state and block
 * automatic submission until the caller reconciles whether the prior request
 * was committed.
 */
export async function getSupportTicketIdempotencyKey(fingerprint: string): Promise<string> {
  if (!fingerprint.trim()) {
    throw new Error("support_ticket_payload_fingerprint_required");
  }

  return runExclusive(async () => {
    memoryRecord ??= await loadInitialRecord();

    if (memoryRecord?.state === "legacy_unknown") {
      throw new SupportTicketRetryOutcomeUnknownError();
    }

    const resolved = resolveRecord(memoryRecord, fingerprint);
    memoryRecord = resolved.record;

    if (resolved.changed) {
      await persistBestEffort(resolved.record);
    }

    return resolved.record.key;
  });
}

/**
 * Rotates the retry key immediately after Core acknowledges the submission.
 * A fresh unbound key replaces the acknowledged key so the same payload cannot
 * reuse the just-committed idempotency key.
 */
export async function clearSupportTicketIdempotencyKey(): Promise<void> {
  await runExclusive(async () => {
    const rotated: SupportTicketRetryRecord = {
      key: createIdempotencyKey(),
      fingerprint: null,
      state: "ready",
    };
    memoryRecord = rotated;

    await persistBestEffort(rotated);
    try {
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // The v2 rotated in-memory record remains authoritative for this process.
    }
  });
}

/**
 * Call only after the communication log proves the legacy unknown request was
 * already committed. This removes the quarantined legacy key and rotates to a
 * fresh ready state without submitting anything automatically.
 */
export async function reconcileLegacySupportTicketRetryAsCommitted(): Promise<void> {
  await runExclusive(async () => {
    memoryRecord ??= await loadInitialRecord();
    if (memoryRecord?.state !== "legacy_unknown") return;

    const rotated: SupportTicketRetryRecord = {
      key: createIdempotencyKey(),
      fingerprint: null,
      state: "ready",
    };
    memoryRecord = rotated;
    await persistBestEffort(rotated);

    try {
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Safe to leave the old key physically present because the valid v2
      // record now takes precedence and the acknowledged key is unreachable.
    }
  });
}

/** Test-only: reset process-local state between isolated test cases. */
export function resetSupportTicketIdempotencyForTests(): void {
  memoryRecord = null;
  operationChain = Promise.resolve();
}
