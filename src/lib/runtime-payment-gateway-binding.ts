import { getBuyerDeploymentRpcAllowlist } from "@/lib/buyer-deployment-rpc-allowlist";
import { BUYER_BOUND_PAYMENT_GATEWAY_RPCS } from "@/types/payment-gateway-contract";

let runtimeBoundRpcsOverride: readonly string[] | null = null;

/** Test-only override for runtime payment-gateway binding probes. */
export function setRuntimePaymentGatewayBoundRpcsForTests(next: readonly string[] | null): void {
  runtimeBoundRpcsOverride = next;
}

/** Deployment allowlist independent from contract-required RPC names. */
export function readRuntimeDeploymentRpcAllowlist(): readonly string[] {
  return getBuyerDeploymentRpcAllowlist();
}

/** Runtime-bound payment gateway RPCs — intersection of deployment allowlist and Core contract. */
export function readRuntimePaymentGatewayBoundRpcs(): readonly string[] {
  if (runtimeBoundRpcsOverride) return runtimeBoundRpcsOverride;
  const deployment = new Set(readRuntimeDeploymentRpcAllowlist());
  return BUYER_BOUND_PAYMENT_GATEWAY_RPCS.filter((rpc) => deployment.has(rpc));
}

export function isRuntimePaymentGatewayBound(): boolean {
  const bound = new Set(readRuntimePaymentGatewayBoundRpcs());
  return BUYER_BOUND_PAYMENT_GATEWAY_RPCS.every((rpc) => bound.has(rpc));
}
