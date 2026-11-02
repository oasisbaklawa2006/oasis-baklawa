import type { BulkAddItem } from "@/lib/draft-add-guard";

/**
 * Bulk "add to cart" that can never overwrite a quantity the buyer (or another session) already chose.
 *
 * Primary path: Core's atomic add_customer_order_draft_line_if_absent_v1, which checks and writes in ONE
 * transaction under the per-company cart lock, so a stale read cannot cause an overwrite.
 *
 * Fallback (only when that Core function is not deployed yet): re-read the cart immediately before each write.
 * That narrows but cannot close the race (Core's upsert replaces quantity), so the result is flagged
 * `usedFallback` and the caller must not describe the outcome as race-free.
 */
export interface IfAbsentResult {
  inserted: boolean;
  existingQuantity: number;
  lineId?: string;
}

export interface BulkAddDeps {
  addIfAbsent: (productId: string, quantity: number) => Promise<IfAbsentResult>;
  /** Fresh cart quantities by product id; used only by the fallback path. */
  readQuantities: () => Promise<Record<string, number>>;
  /** Core's replacing upsert; used only by the fallback path after a fresh read shows the product absent. */
  upsert: (productId: string, quantity: number) => Promise<void>;
  isFunctionMissing: (error: unknown) => boolean;
}

export interface BulkAddOutcome {
  added: BulkAddItem[];
  /** Already in the cart; left untouched. */
  skipped: { productId: string; existingQuantity: number; requestedQuantity: number }[];
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
      if (!out.usedFallback) {
        try {
          const r = await deps.addIfAbsent(item.productId, item.quantity);
          if (r.inserted) out.added.push(item);
          else out.skipped.push({ productId: item.productId, existingQuantity: r.existingQuantity, requestedQuantity: item.quantity });
          continue;
        } catch (e) {
          if (!deps.isFunctionMissing(e)) throw e;
          out.usedFallback = true; // Core function not deployed: degrade for the rest of this batch
        }
      }
      const current = (await deps.readQuantities())[item.productId];
      if (current !== undefined) {
        out.skipped.push({ productId: item.productId, existingQuantity: current, requestedQuantity: item.quantity });
      } else {
        await deps.upsert(item.productId, item.quantity);
        out.added.push(item);
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
