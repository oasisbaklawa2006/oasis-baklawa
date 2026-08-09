import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type PublicFunctions = Database["public"]["Functions"];
export type RpcArgs<Fn extends keyof PublicFunctions> = PublicFunctions[Fn]["Args"];

export type ZeroArgRpc = {
  [Fn in keyof PublicFunctions]: Record<string, never> extends RpcArgs<Fn> ? Fn : never;
}[keyof PublicFunctions];

export type ParamRpc = Exclude<keyof PublicFunctions, ZeroArgRpc>;

type RpcInvoker = <Fn extends keyof PublicFunctions>(
  fn: Fn,
  args?: PublicFunctions[Fn]["Args"]
) => Promise<{ data: PublicFunctions[Fn]["Returns"] | null; error: Error | null }>;

const invokeRpc = supabase.rpc as unknown as RpcInvoker;

export async function callRpc<Fn extends ZeroArgRpc>(
  fn: Fn,
  args?: RpcArgs<Fn>
): Promise<PublicFunctions[Fn]["Returns"]>;
export async function callRpc<Fn extends ParamRpc>(
  fn: Fn,
  args: RpcArgs<Fn>
): Promise<PublicFunctions[Fn]["Returns"]>;
export async function callRpc<Fn extends keyof PublicFunctions>(
  fn: Fn,
  args?: RpcArgs<Fn>
): Promise<PublicFunctions[Fn]["Returns"]> {
  const { data, error } = await invokeRpc(fn, args);
  if (error) throw error;
  return data as PublicFunctions[Fn]["Returns"];
}
