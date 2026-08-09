import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RpcArgs, ZeroArgRpc, ParamRpc } from "./rpc";

type CallRpcArgs<Fn extends ZeroArgRpc | ParamRpc> = Fn extends ZeroArgRpc
  ? [args?: RpcArgs<Fn>]
  : [args: RpcArgs<Fn>];

type Expect<T extends true> = T;

type FirstArgRequired<T extends readonly unknown[]> = undefined extends T[0] ? false : true;

type RpcArgTypingChecks = [
  Expect<FirstArgRequired<CallRpcArgs<"published_products_v1">> extends false ? true : false>,
  Expect<FirstArgRequired<CallRpcArgs<"calculate_customer_advance_v1">> extends true ? true : false>,
  Expect<"published_products_v1" extends ZeroArgRpc ? true : false>,
  Expect<"calculate_customer_advance_v1" extends ParamRpc ? true : false>,
  Expect<[{}] extends CallRpcArgs<"published_products_v1"> ? true : false>,
];

const rpcArgTypingChecks: RpcArgTypingChecks = [true, true, true, true, true];

describe("callRpc argument typing", () => {
  it("classifies zero-argument and parameterized RPCs at compile time", () => {
    assert.deepEqual(rpcArgTypingChecks, [true, true, true, true, true]);
  });
});
