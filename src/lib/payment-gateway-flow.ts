import {
  createPaymentGatewayPayableIntent,
  fetchPaymentGatewayPayableStatus,
} from "@/lib/api/payment-gateway";
import { createIdempotencyKey } from "@/lib/idempotency";
import { isTerminalPaymentStatus } from "@/lib/payment-gateway-boundary";
import {
  clearPaymentIdempotencyKey,
  resolvePaymentIdempotencyKey,
} from "@/lib/payment-idempotency";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerFinanceFacts } from "@/types/database.types";
import {
  DEFAULT_PAYMENT_PROVIDER_CODE,
  type CreatePaymentGatewayIntentInput,
  type PaymentGatewayPayableStatus,
  type PaymentGatewayPurpose,
} from "@/types/payment-gateway-contract";

export type PaymentFlowPhase = "idle" | "creating_intent" | "awaiting_gateway" | "polling" | "succeeded" | "failed";

export interface PaymentFlowState {
  phase: PaymentFlowPhase;
  paymentIntentId: string | null;
  providerOrderId: string | null;
  status: PaymentGatewayPayableStatus | null;
  message: string | null;
}

export interface InitiatePaymentInput {
  orderId: string;
  piId: string;
  commercialVersionId: string;
  paymentPurpose: PaymentGatewayPurpose;
}

export async function initiateGovernedPayment(input: InitiatePaymentInput): Promise<PaymentFlowState> {
  const resolved = await resolvePaymentIdempotencyKey(input.orderId, input.paymentPurpose);
  if (!resolved.key || !resolved.persisted) {
    return {
      phase: "failed",
      paymentIntentId: null,
      providerOrderId: null,
      status: null,
      message: "Could not persist your payment attempt locally. Retry when storage is available.",
    };
  }

  const correlationId = createIdempotencyKey();
  const intentInput: CreatePaymentGatewayIntentInput = {
    orderId: input.orderId,
    piId: input.piId,
    commercialVersionId: input.commercialVersionId,
    paymentPurpose: input.paymentPurpose,
    providerCode: DEFAULT_PAYMENT_PROVIDER_CODE,
    correlationId,
    idempotencyKey: resolved.key,
  };

  try {
    const intent = await createPaymentGatewayPayableIntent(intentInput);
    const status = await fetchPaymentGatewayPayableStatus(intent.intent_id).catch(() => null);

    return {
      phase: "awaiting_gateway",
      paymentIntentId: intent.intent_id,
      providerOrderId: status?.provider_order_id ?? null,
      status,
      message: intent.already_created
        ? "Payment intent already exists for this attempt. Refresh status to confirm coverage."
        : "Payment intent created with Core. Complete the gateway session, then refresh status here.",
    };
  } catch (error) {
    return {
      phase: "failed",
      paymentIntentId: null,
      providerOrderId: null,
      status: null,
      message: parseRpcError(error).message,
    };
  }
}

export async function refreshPaymentIntentStatus(
  paymentIntentId: string,
  orderId: string,
  paymentPurpose: PaymentGatewayPurpose = "advance"
): Promise<{ flow: PaymentFlowState; financeFacts: CustomerFinanceFacts | null }> {
  try {
    const status = await fetchPaymentGatewayPayableStatus(paymentIntentId);
    const terminal = isTerminalPaymentStatus(status.status);

    if (terminal === "success") {
      await clearPaymentIdempotencyKey(orderId, paymentPurpose).catch(() => undefined);
      return {
        flow: {
          phase: "succeeded",
          paymentIntentId,
          providerOrderId: status.provider_order_id,
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
          providerOrderId: status.provider_order_id,
          status,
          message: "Payment did not complete. You can retry when ready.",
        },
        financeFacts: null,
      };
    }

    return {
      flow: {
        phase: "polling",
        paymentIntentId,
        providerOrderId: status.provider_order_id,
        status,
        message: status.provider_order_id
          ? "Gateway session is pending. Complete payment with the provider, then refresh status."
          : "Payment is still pending with the gateway.",
      },
      financeFacts: null,
    };
  } catch (error) {
    return {
      flow: {
        phase: "failed",
        paymentIntentId,
        providerOrderId: null,
        status: null,
        message: parseRpcError(error).message,
      },
      financeFacts: null,
    };
  }
}
