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
import { openRazorpayNativeCheckout } from "@/lib/razorpay-native-checkout";
import {
  prepareRazorpayCheckoutOrder,
  RAZORPAY_RUNTIME_ENABLED,
} from "@/lib/razorpay-runtime";
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

  try {
    if (RAZORPAY_RUNTIME_ENABLED) {
      const order = await prepareRazorpayCheckoutOrder({
        ...input,
        correlationId,
        idempotencyKey: resolved.key,
      });

      try {
        await openRazorpayNativeCheckout(order);
      } catch {
        const status = await fetchPaymentGatewayPayableStatus(order.intentId).catch(() => null);
        const terminal = status ? isTerminalPaymentStatus(status.status) : null;

        if (terminal === "success") {
          await clearPaymentIdempotencyKey(input.orderId, input.paymentPurpose).catch(() => undefined);
          return {
            phase: "succeeded",
            paymentIntentId: order.intentId,
            providerOrderId: order.providerOrderId,
            status,
            message: "Payment status confirmed by Core.",
          };
        }
        if (terminal === "failure") {
          return {
            phase: "failed",
            paymentIntentId: order.intentId,
            providerOrderId: order.providerOrderId,
            status,
            message: "Core confirmed that the payment did not complete.",
          };
        }
        return {
          phase: "awaiting_gateway",
          paymentIntentId: order.intentId,
          providerOrderId: order.providerOrderId,
          status,
          message: "The payment window closed before Core confirmed settlement. Check payment status before retrying.",
        };
      }

      const status = await fetchPaymentGatewayPayableStatus(order.intentId).catch(() => null);
      const terminal = status ? isTerminalPaymentStatus(status.status) : null;

      if (terminal === "success") {
        await clearPaymentIdempotencyKey(input.orderId, input.paymentPurpose).catch(() => undefined);
        return {
          phase: "succeeded",
          paymentIntentId: order.intentId,
          providerOrderId: order.providerOrderId,
          status,
          message: "Payment status confirmed by Core.",
        };
      }
      if (terminal === "failure") {
        return {
          phase: "failed",
          paymentIntentId: order.intentId,
          providerOrderId: order.providerOrderId,
          status,
          message: "Core confirmed that the payment did not complete.",
        };
      }

      return {
        phase: "polling",
        paymentIntentId: order.intentId,
        providerOrderId: order.providerOrderId,
        status,
        message: "Razorpay returned from checkout. Waiting for signed provider confirmation before marking the payment received.",
      };
    }

    const intentInput: CreatePaymentGatewayIntentInput = {
      orderId: input.orderId,
      piId: input.piId,
      commercialVersionId: input.commercialVersionId,
      paymentPurpose: input.paymentPurpose,
      providerCode: DEFAULT_PAYMENT_PROVIDER_CODE,
      correlationId,
      idempotencyKey: resolved.key,
    };
    const intent = await createPaymentGatewayPayableIntent(intentInput);
    const status = await fetchPaymentGatewayPayableStatus(intent.intent_id).catch(() => null);

    return {
      phase: "awaiting_gateway",
      paymentIntentId: intent.intent_id,
      providerOrderId: status?.provider_order_id ?? null,
      status,
      message: intent.already_created
        ? "Payment intent already exists for this attempt. Refresh status to confirm coverage."
        : "Payment intent created with Core. Provider checkout remains disabled for this build; refresh status after an authorized payment channel is used.",
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
