import { callRpc } from "@/lib/rpc";
import type { CoreRpc } from "@/lib/carton-support-loader";

/** Authenticated read of the two Core projections through the governed RPC layer; errors become values so callers fail closed. */
export const liveCartonRpc: CoreRpc = async (name) => {
  try {
    return { data: await callRpc(name), error: null };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return { data: null, error: { code: err?.code, message: err?.message ?? "rpc failed" } };
  }
};
