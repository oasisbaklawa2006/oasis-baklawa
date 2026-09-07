import { createCustomerPaymentIntent, fetchCustomerPaymentIntentStatus } from "@/lib/api/payment-gateway";
import { openExternalUrl } from "@/lib/open-external-url";
import { isTerminalPaymentStatus } from "@/lib/payment-gateway-boundary";
import {
  clearPaymentIdempotencyKey,
  resolvePaymentIdempotencyKey,
} from "@/lib/payment-idempotency";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerFinanceFacts } from "@/types/database.types";
import type { CustomerPaymentIntentStatusResult } from "@/types/payment-gateway-contract";

export type PaymentFlowPhase = "idle" | "creating_intent" | "awaiting_gateway" | "polling" | "succeeded" | "failed";

export interface PaymentFlowState {
  phase: PaymentFlowPhase;
  paymentIntentId: string | null;
  gatewayCheckoutUrl: string | null;
  status: CustomerPaymentIntentStatusResult | null;
  message: string | null;
}

export async function initiateAdvancePayment(orderId: string): Promise<PaymentFlowState> {
  const resolved = await resolvePaymentIdempotencyKey(orderId);
  if (!resolved.key || !resolved.persisted) {
    return {
      phase: "failed",
      paymentIntentId: null,
      gatewayCheckoutUrl: null,
      status: null,
      message: "Could not persist your payment attempt locally. Retry when storage is available.",
    };
  }

  try {
    const intent = await createCustomerPaymentIntent({
      orderId,
      idempotencyKey: resolved.key,
    });

    if (intent.gateway_checkout_url) {
      await openExternalUrl(intent.gateway_checkout_url);
    }

    return {
      phase: "awaiting_gateway",
      paymentIntentId: intent.payment_intent_id,
      gatewayCheckoutUrl: intent.gateway_checkout_url,
      status: {
        payment_intent_id: intent.payment_intent_id,
        status: intent.status,
        verified_amount: null,
        failure_reason: null,
      },
      message: intent.gateway_checkout_url
        ? "Complete payment in the gateway, then refresh status here."
        : intent.already_applied
          ? "Payment intent already applied. Refresh status to confirm advance coverage."
          : "Payment intent created. Refresh status when the gateway session completes.",
    };
  } catch (error) {
    return {
      phase: "failed",
      paymentIntentId: null,
      gatewayCheckoutUrl: null,
      status: null,
      message: parseRpcError(error).message,
    };
  }
}

export async function refreshPaymentIntentStatus(
  paymentIntentId: string,
  orderId: string
): Promise<{ flow: PaymentFlowState; financeFacts: CustomerFinanceFacts | null }> {
  try {
    const status = await fetchCustomerPaymentIntentStatus(paymentIntentId);
    const terminal = isTerminalPaymentStatus(status.status);

    if (terminal === "success") {
      await clearPaymentIdempotencyKey(orderId).catch(() => undefined);
      return {
        flow: {
          phase: "succeeded",
          paymentIntentId,
          gatewayCheckoutUrl: null,
          status,
          message: "Payment status confirmed by Core. Finance facts will refresh.",
        },
        financeFacts: null,
      };
    }

    if (terminal === "failure") {
      return {
        flow: {
          phase: "failed",
          paymentIntentId,
          gatewayCheckoutUrl: null,
          status,
          message: status.failure_reason ?? "Payment did not complete. You can retry when ready.",
        },
        financeFacts: null,
      };
    }

    return {
      flow: {
        phase: "polling",
        paymentIntentId,
        gatewayCheckoutUrl: null,
        status,
        message: "Payment is still pending with the gateway.",
      },
      financeFacts: null,
    };
  } catch (error) {
    return {
      flow: {
        phase: "failed",
        paymentIntentId,
        gatewayCheckoutUrl: null,
        status: null,
        message: parseRpcError(error).message,
      },
      financeFacts: null,
    };
  }
}
