import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BulkAddPartialError, bulkAddIfAbsent, describeSkipped, isRetryableConcurrencyError, isRpcFunctionMissing, withBoundedRetry, type BulkAddDeps } from "./draft-bulk-add";

/** In-memory model of the Core cart RPC semantics, keyed by company (tenant isolation). */
class FakeCore {
  carts = new Map<string, Map<string, number>>();
  insertIfAbsentDeployed = true;
  private cart(company: string) { if (!this.carts.has(company)) this.carts.set(company, new Map()); return this.carts.get(company)!; }
  qty(company: string, product: string) { return this.cart(company).get(product); }
  /** Core add_customer_order_draft_line_v1: UPSERT, replaces quantity. */
  async upsert(company: string, product: string, quantity: number) { await Promise.resolve(); this.cart(company).set(product, quantity); }
  /** Core add_customer_order_draft_line_if_absent_v1: atomic check + write. */
  async ifAbsent(company: string, product: string, quantity: number) {
    await Promise.resolve();
    if (!this.insertIfAbsentDeployed) throw Object.assign(new Error("Could not find the function public.add_customer_order_draft_line_if_absent_v1"), { code: "PGRST202" });
    const c = this.cart(company);
    const existing = c.get(product);
    if (existing !== undefined) return { inserted: false, existingQuantity: existing };
    c.set(product, quantity);
    return { inserted: true, existingQuantity: quantity };
  }
  snapshot(company: string) { return Object.fromEntries(this.cart(company)); }
  deps(company: string, hooks: { beforeFallbackWrite?: () => Promise<void> } = {}): BulkAddDeps {
    return {
      addIfAbsent: (p, q) => this.ifAbsent(company, p, q),
      readQuantities: async () => { await Promise.resolve(); return this.snapshot(company); },
      upsert: async (p, q) => { await hooks.beforeFallbackWrite?.(); await this.upsert(company, p, q); },
      isFunctionMissing: isRpcFunctionMissing,
    };
  }
}

describe("bulkAddIfAbsent (atomic path)", () => {
  it("adds absent products and reports them", async () => {
    const core = new FakeCore();
    const r = await bulkAddIfAbsent([{ productId: "a", quantity: 9 }, { productId: "b", quantity: 18 }], core.deps("A"));
    assert.deepEqual(r.added.map((i) => i.productId), ["a", "b"]);
    assert.equal(r.skipped.length, 0);
    assert.equal(r.usedFallback, false);
    assert.deepEqual(core.snapshot("A"), { a: 9, b: 18 });
  });

  it("stale read: a newer quantity written by another session is NOT overwritten", async () => {
    const core = new FakeCore();
    const staleView = core.snapshot("A"); // this session believes the cart is empty
    assert.equal(staleView.a, undefined);
    await core.upsert("A", "a", 27); // another session adds 27 after that read
    const r = await bulkAddIfAbsent([{ productId: "a", quantity: 9 }], core.deps("A"));
    assert.equal(core.qty("A", "a"), 27);
    assert.deepEqual(r.skipped, [{ productId: "a", existingQuantity: 27, requestedQuantity: 9 }]);
    assert.equal(r.added.length, 0);
  });

  it("baseline defect: the replacing upsert after a stale read DOES overwrite (why the atomic call exists)", async () => {
    const core = new FakeCore();
    const stale = core.snapshot("A");
    await core.upsert("A", "a", 27);
    if (stale.a === undefined) await core.upsert("A", "a", 9); // the old read-then-write flow
    assert.equal(core.qty("A", "a"), 9, "27 was lost");
  });

  it("retry is idempotent: the second run changes nothing and reports everything as already present", async () => {
    const core = new FakeCore();
    const items = [{ productId: "a", quantity: 9 }, { productId: "b", quantity: 18 }];
    await bulkAddIfAbsent(items, core.deps("A"));
    const again = await bulkAddIfAbsent([{ productId: "a", quantity: 99 }, { productId: "b", quantity: 99 }], core.deps("A"));
    assert.equal(again.added.length, 0);
    assert.deepEqual(core.snapshot("A"), { a: 9, b: 18 });
    assert.deepEqual(again.skipped.map((s) => s.existingQuantity), [9, 18]);
  });

  it("concurrent bulk adds from two sessions: one winner per product, no lost update", async () => {
    const core = new FakeCore();
    const runs = Array.from({ length: 12 }, (_, i) => bulkAddIfAbsent(
      [{ productId: "a", quantity: 9 * (i + 1) }, { productId: "b", quantity: 9 * (12 - i) }],
      core.deps("A")
    ));
    const outs = await Promise.all(runs);
    for (const p of ["a", "b"]) {
      const winners = outs.filter((o) => o.added.some((x) => x.productId === p));
      assert.equal(winners.length, 1, `exactly one winner for ${p}`);
      const won = winners[0].added.find((x) => x.productId === p)!.quantity;
      assert.equal(core.qty("A", p), won);
      for (const o of outs) for (const s of o.skipped.filter((s) => s.productId === p)) assert.equal(s.existingQuantity, won);
    }
  });

  it("tenant isolation: another company's cart is neither read nor changed", async () => {
    const core = new FakeCore();
    await core.upsert("A", "a", 27);
    const r = await bulkAddIfAbsent([{ productId: "a", quantity: 9 }], core.deps("B"));
    assert.deepEqual(r.added.map((i) => i.productId), ["a"]);
    assert.equal(r.skipped.length, 0, "B does not see A's line");
    assert.equal(core.qty("A", "a"), 27);
    assert.equal(core.qty("B", "a"), 9);
  });

  it("duplicate source rows: the first one wins", async () => {
    const core = new FakeCore();
    const r = await bulkAddIfAbsent([{ productId: "a", quantity: 9 }, { productId: "a", quantity: 99 }], core.deps("A"));
    assert.equal(core.qty("A", "a"), 9);
    assert.equal(r.added.length, 1);
  });

  it("a real failure stops the batch and reports what was already added", async () => {
    const core = new FakeCore();
    const deps = core.deps("A");
    let n = 0;
    deps.addIfAbsent = async (p, q) => { if (++n === 2) throw Object.assign(new Error("QUANTITY_RULE_VIOLATION"), { code: "P0001" }); return core.ifAbsent("A", p, q); };
    await assert.rejects(
      () => bulkAddIfAbsent([{ productId: "a", quantity: 9 }, { productId: "b", quantity: 10 }, { productId: "c", quantity: 9 }], deps),
      (e: unknown) => e instanceof BulkAddPartialError && e.failedProductId === "b" && e.partial.added.length === 1 && /QUANTITY_RULE/.test(e.message)
    );
    assert.deepEqual(core.snapshot("A"), { a: 9 });
  });
});

describe("bulkAddIfAbsent (atomic RPC unavailable: fail closed)", () => {
  it("rejects without replacing a previously selected quantity", async () => {
    const core = new FakeCore();
    core.insertIfAbsentDeployed = false;
    await core.upsert("A", "a", 27);
    const deps = core.deps("A", { beforeFallbackWrite: async () => { throw new Error("unsafe upsert must never run"); } });
    await assert.rejects(
      () => bulkAddIfAbsent([{ productId: "a", quantity: 9 }, { productId: "b", quantity: 18 }], deps),
      (e: unknown) => e instanceof BulkAddPartialError && e.failedProductId === "a" &&
        e.partial.added.length === 0 && e.partial.usedFallback === false &&
        /Atomic cart add is unavailable/.test(e.message)
    );
    assert.deepEqual(core.snapshot("A"), { a: 27 }, "no cart mutation when atomic RPC is missing");
  });

  it("stops a partly completed batch when the atomic RPC disappears, without a fallback write", async () => {
    const core = new FakeCore();
    const deps = core.deps("A", { beforeFallbackWrite: async () => { throw new Error("unsafe upsert must never run"); } });
    let calls = 0;
    deps.addIfAbsent = async (p, q) => {
      if (++calls === 2) throw Object.assign(new Error("function not found"), { code: "PGRST202" });
      return core.ifAbsent("A", p, q);
    };
    await assert.rejects(
      () => bulkAddIfAbsent([{ productId: "a", quantity: 9 }, { productId: "b", quantity: 18 }], deps),
      (e: unknown) => e instanceof BulkAddPartialError && e.failedProductId === "b" &&
        e.partial.added.length === 1 && e.partial.usedFallback === false &&
        /Atomic cart add is unavailable/.test(e.message)
    );
    assert.deepEqual(core.snapshot("A"), { a: 9 }, "first atomic insert remains; no second write");
  });
});

describe("helpers", () => {
  it("recognises only a missing function as 'not deployed'", () => {
    assert.equal(isRpcFunctionMissing({ code: "PGRST202" }), true);
    assert.equal(isRpcFunctionMissing({ code: "42883" }), true);
    assert.equal(isRpcFunctionMissing({ message: "Could not find the function public.x in the schema cache" }), true);
    assert.equal(isRpcFunctionMissing({ code: "42501", message: "BUYER_NOT_ELIGIBLE" }), false);
    assert.equal(isRpcFunctionMissing(null), false);
  });
  it("describes skipped quantities for the buyer", () => {
    assert.deepEqual(
      describeSkipped([{ productId: "a", existingQuantity: 5, requestedQuantity: 100 }], () => "Kaju Katli"),
      ["Kaju Katli: already in your cart at 5 (you asked for 100); left unchanged."]
    );
  });
});

describe("bounded 40P01 / 40001 handling", () => {
  const noSleep = { maxAttempts: 3, baseDelayMs: 1, sleep: async () => {} };
  const deadlock = () => Object.assign(new Error("deadlock detected"), { code: "40P01" });

  it("classifies only concurrency aborts as retryable", () => {
    assert.equal(isRetryableConcurrencyError({ code: "40P01" }), true);
    assert.equal(isRetryableConcurrencyError({ code: "40001" }), true);
    assert.equal(isRetryableConcurrencyError({ message: "ERROR: deadlock detected" }), true);
    for (const code of ["42501", "P0002", "PGRST202", "23505", "28000"]) assert.equal(isRetryableConcurrencyError({ code }), false);
    assert.equal(isRetryableConcurrencyError(null), false);
  });

  it("retries a deadlock victim and succeeds without writing twice", async () => {
    const core = new FakeCore();
    let calls = 0;
    const deps: BulkAddDeps = { ...core.deps("co"), retry: noSleep, addIfAbsent: async (p, q) => { calls++; if (calls < 3) throw deadlock(); return core.ifAbsent("co", p, q); } };
    const out = await bulkAddIfAbsent([{ productId: "p1", quantity: 9 }], deps);
    assert.equal(calls, 3);
    assert.deepEqual(out.added, [{ productId: "p1", quantity: 9 }]);
    assert.equal(core.qty("co", "p1"), 9);
  });

  it("gives up after the bounded number of attempts and reports a partial result", async () => {
    const core = new FakeCore();
    let calls = 0;
    const deps: BulkAddDeps = { ...core.deps("co"), retry: noSleep, addIfAbsent: async (p, q) => { if (p === "p2") { calls++; throw deadlock(); } return core.ifAbsent("co", p, q); } };
    await assert.rejects(bulkAddIfAbsent([{ productId: "p1", quantity: 9 }, { productId: "p2", quantity: 9 }], deps), (e: unknown) => {
      assert.ok(e instanceof BulkAddPartialError);
      assert.equal((e.cause as { code?: string }).code, "40P01");
      assert.equal(e.failedProductId, "p2");
      assert.deepEqual(e.partial.added, [{ productId: "p1", quantity: 9 }]);
      return true;
    });
    assert.equal(calls, 3, "exactly maxAttempts calls, never unbounded");
    assert.equal(core.qty("co", "p2"), undefined);
  });

  it("does not retry other errors (permission, missing function, not found)", async () => {
    for (const code of ["42501", "P0002", "PGRST202"]) {
      let calls = 0;
      await assert.rejects(withBoundedRetry(async () => { calls++; throw Object.assign(new Error("x"), { code }); }, noSleep));
      assert.equal(calls, 1, code);
    }
  });

  it("backs off exponentially between attempts", async () => {
    const delays: number[] = [];
    await assert.rejects(withBoundedRetry(async () => { throw deadlock(); }, { maxAttempts: 4, baseDelayMs: 10, sleep: async (ms) => { delays.push(ms); } }));
    assert.deepEqual(delays, [10, 20, 40]);
  });

  it("never overwrites an existing quantity even when the first attempt was a deadlock victim", async () => {
    const core = new FakeCore();
    await core.upsert("co", "p1", 27);
    let calls = 0;
    const deps: BulkAddDeps = { ...core.deps("co"), retry: noSleep, addIfAbsent: async (p, q) => { calls++; if (calls === 1) throw deadlock(); return core.ifAbsent("co", p, q); } };
    const out = await bulkAddIfAbsent([{ productId: "p1", quantity: 9 }], deps);
    assert.equal(out.skipped.length, 1);
    assert.equal(core.qty("co", "p1"), 27);
  });
});
