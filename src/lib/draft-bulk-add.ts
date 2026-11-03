import type { BulkAddItem } from "@/lib/draft-add-guard";

/**
 * Bulk "add to cart" that can never overwrite a quantity the buyer (or another session) already chose.
 *
 * Primary path: Core's atomic add_customer_order_draft_line_if_absent_v1, which checks and writes in ONE
 * transaction under the per-company cart lock, so a stale read cannot cause an overwrite.
 *
 * If the atomic Core RPC is unavailable, fail closed. A read-then-upsert fallback is not atomic
 * and can overwrite another session's chosen quantity, so it must never be used.
 */
export interface IfAbsentResult {
  inserted: boolean;
  existingQuantity: number;
  lineId?: string;
}

/**
 * Bounded caller handling for PostgreSQL concurrency aborts.
 * SQLSTATE 40P01 (deadlock_detected) and 40001 (serialization_failure) abort and fully roll back the single RPC transaction,
 * so repeating the SAME call is safe; add_customer_order_draft_line_if_absent_v1 is also idempotent (a repeat reports
 * inserted=false instead of writing twice). Retries are capped, back off, and never apply to any other error.
 */
export interface RetryPolicy {
  /** Total attempts including the first (>= 1). */
  maxAttempts: number;
  baseDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
}

export const CONCURRENCY_RETRY: RetryPolicy = { maxAttempts: 3, baseDelayMs: 75 };

export function isRetryableConcurrencyError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  return e.code === "40P01" || e.code === "40001" || /deadlock detected/i.test(e.message ?? "");
}

export async function withBoundedRetry<T>(call: () => Promise<T>, policy: RetryPolicy = CONCURRENCY_RETRY): Promise<T> {
  const attempts = Math.max(1, Math.floor(policy.maxAttempts));
  const sleep = policy.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (e) {
      if (attempt >= attempts || !isRetryableConcurrencyError(e)) throw e;
      await sleep(policy.baseDelayMs * 2 ** (attempt - 1));
    }
  }
}

export interface BulkAddDeps {
  addIfAbsent: (productId: string, quantity: number) => Promise<IfAbsentResult>;
  /** Legacy adapter property, intentionally unused: non-atomic fallback is forbidden. */
  readQuantities: () => Promise<Record<string, number>>;
  /** Legacy adapter property, intentionally unused: replacing upsert is forbidden here. */
  upsert: (productId: string, quantity: number) => Promise<void>;
  isFunctionMissing: (error: unknown) => boolean;
  /** Optional override of the bounded 40P01/40001 retry (tests inject a no-op sleep). */
  retry?: RetryPolicy;
}

export interface BulkAddOutcome {
  added: BulkAddItem[];
  /** Already in the cart; left untouched. */
  skipped: { productId: string; existingQuantity: number; requestedQuantity: number }[];
  /** Compatibility field: always false; no non-atomic fallback is permitted. */
  usedFallback: boolean;
}

export class BulkAddPartialError extends Error {
  constructor(
    public readonly cause: unknown,
    public readonly partial: BulkAddOutcome,
    public readonly failedProductId: string
  ) {
    super(cause instanceof Error ? cause.message : "Bulk add failed");
  }
}

export async function bulkAddIfAbsent(items: readonly BulkAddItem[], deps: BulkAddDeps): Promise<BulkAddOutcome> {
  const out: BulkAddOutcome = { added: [], skipped: [], usedFallback: false };
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.productId)) continue; // duplicate source rows: first wins
    seen.add(item.productId);
    try {
      try {
        const r = await withBoundedRetry(() => deps.addIfAbsent(item.productId, item.quantity), deps.retry);
        if (r.inserted) out.added.push(item);
        else out.skipped.push({ productId: item.productId, existingQuantity: r.existingQuantity, requestedQuantity: item.quantity });
      } catch (e) {
        if (deps.isFunctionMissing(e)) {
          throw new Error("Atomic cart add is unavailable. No non-atomic fallback write is permitted.");
        }
        throw e;
      }
    } catch (e) {
      throw new BulkAddPartialError(e, out, item.productId);
    }
  }
  return out;
}

/** PostgREST PGRST202 / Postgres 42883 = the RPC does not exist (yet). Anything else is a real failure. */
export function isRpcFunctionMissing(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  return e.code === "PGRST202" || e.code === "42883" || /could not find the function/i.test(e.message ?? "");
}

export function describeSkipped(
  skipped: BulkAddOutcome["skipped"],
  nameOf: (productId: string) => string
): string[] {
  return skipped.map(
    (s) => `${nameOf(s.productId)}: already in your cart at ${s.existingQuantity} (you asked for ${s.requestedQuantity}); left unchanged.`
  );
}
