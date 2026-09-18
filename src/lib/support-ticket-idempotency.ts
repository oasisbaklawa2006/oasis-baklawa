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

export class SupportTicketRetryOutcomeUnknownError extends Error {
  constructor() {
    super("support_ticket_retry_outcome_unknown");
    this.name = "SupportTicketRetryOutcomeUnknownError";
  }
}

export class SupportTicketRetryStorageUnavailableError extends Error {
  constructor() {
    super("support_ticket_retry_state_unavailable");
    this.name = "SupportTicketRetryStorageUnavailableError";
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

export function isSupportTicketRetryStorageUnavailableError(
  error: unknown
): error is SupportTicketRetryStorageUnavailableError {
  return (
    error instanceof SupportTicketRetryStorageUnavailableError ||
    (error instanceof Error && error.message === "support_ticket_retry_state_unavailable")
  );
}

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
    const parsed = JSON.parse(raw) as Partial<SupportTicketRetryRecord> & {
      state?: unknown;
    };
    if (
      typeof parsed.key === "string" &&
      parsed.key.trim().length > 0 &&
      (typeof parsed.fingerprint === "string" || parsed.fingerprint === null)
    ) {
      const state: RetryRecordState =
        parsed.state === undefined || parsed.state === "ready"
          ? "ready"
          : "legacy_unknown";

      return {
        key: parsed.key,
        fingerprint: parsed.fingerprint,
        state,
      };
    }
  } catch {
    // Historical v1 data could be a bare idempotency key. Preserve it as an
    // unknown-outcome retry state; never silently substitute a new key.
    return {
      key: raw.trim(),
      fingerprint: null,
      state: "legacy_unknown",
    };
  }

  // Any non-empty record that cannot be proven to be the current ready schema
  // is treated as an unknown prior outcome. Do not manufacture a replacement
  // key that could duplicate an already-accepted request.
  return {
    key: raw.trim(),
    fingerprint: null,
    state: "legacy_unknown",
  };
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
    // Used only after Core has already acknowledged a request, or while
    // preserving a quarantined legacy record. The in-process state remains
    // fail-closed/safe.
  }
}

async function persistBeforeSubmission(record: SupportTicketRetryRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    throw new SupportTicketRetryStorageUnavailableError();
  }
}

async function readStorage(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    throw new SupportTicketRetryStorageUnavailableError();
  }
}

async function loadInitialRecord(): Promise<SupportTicketRetryRecord | null> {
  const currentRaw = await readStorage(STORAGE_KEY);
  const current = parseStoredRecord(currentRaw);
  if (current) return current;

  const legacyRaw = await readStorage(LEGACY_STORAGE_KEY);
  if (legacyRaw?.trim()) {
    const legacy: SupportTicketRetryRecord = {
      key: legacyRaw.trim(),
      fingerprint: null,
      state: "legacy_unknown",
    };
    await persistBestEffort(legacy);
    return legacy;
  }

  // Null is returned only after both durable storage reads have succeeded and
  // confirmed that no retry state exists.
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

/**
 * Returns a retry key bound to the exact ticket payload. All storage reads,
 * record resolution and persistence are serialized so cold-start concurrent
 * callers cannot generate competing keys.
 *
 * Historical/unknown records are quarantined and block automatic submission
 * until a uniquely correlated outcome can be reconciled.
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

    if (resolved.changed) {
      // A submission key must be durable before it can leave the device. If
      // storage is unreadable/unwritable, fail closed and do not call Core.
      await persistBeforeSubmission(resolved.record);
    }

    memoryRecord = resolved.record;
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
      // The rotated in-memory record remains authoritative for this process.
    }
  });
}

/**
 * Call only after an external/manual reconciliation can uniquely correlate the
 * quarantined legacy key (or another unique submission identifier) with a
 * committed Core ticket. Payload equality alone is never sufficient.
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
