import { supabase } from "@/lib/supabase";

/** Typed escape hatch for governed RPC calls until `supabase gen types` is run in CI. */
export async function callRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
}
