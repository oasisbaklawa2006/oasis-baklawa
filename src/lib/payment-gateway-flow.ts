import { fetchPaymentGatewayPayableStatus } from "@/lib/api/payment-gateway";
import { createIdempotencyKey } from "@/lib/idempotency";
import { isTerminalPaymentStatus } from "@/lib/payment-gateway-boundary";
import {
  clearPaymentIdempotencyKey,
  resolvePaymentIdempotencyKey,
} from "@/lib/payment-idempotency";
import { openNativeRazorpayCheckout } from "@/lib/razorpay-native-checkout";
import {
  prepareRazorpayCheckoutOrder,
  RAZORPAY_RUNTIME_ENABLED,
} from "@/lib/razorpay-runtime";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerFinanceFacts } from "@/types/database.types";
import type {
  PaymentGatewayPayableStatus,
  PaymentGatewayPurpose,
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
  orderNumber?: string;
  piId: string;
  commercialVersionId: string;
  paymentPurpose: PaymentGatewayPurpose;
}

export async function initiateGovernedPayment(input: InitiatePaymentInput): Promise<PaymentFlowState> {
  if (!RAZORPAY_RUNTIME_ENABLED) {
    return {
      phase: "failed",
      paymentIntentId: null,
      providerOrderId: null,
      status: null,
      message: "Online Razorpay checkout is not enabled in this app build.",
    };
  }

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
    const providerOrder = await prepareRazorpayCheckoutOrder({
      orderId: input.orderId,
      piId: input.piId,
      commercialVersionId: input.commercialVersionId,
      paymentPurpose: input.paymentPurpose,
      correlationId,
      idempotencyKey: resolved.key,
    });

    let checkoutReturned = false;
    let checkoutMessage: string | null = null;
    try {
      await openNativeRazorpayCheckout(providerOrder, input.orderNumber);
      checkoutReturned = true;
    } catch (error) {
      checkoutMessage = error instanceof Error
        ? error.message
        : "The Razorpay checkout was closed or could not complete.";
    }

    const status = await fetchPaymentGatewayPayableStatus(providerOrder.intentId).catch(() => null);
    if (!status) {
      return {
        phase: "awaiting_gateway",
        paymentIntentId: providerOrder.intentId,
        providerOrderId: providerOrder.providerOrderId,
        status: null,
        message: checkoutReturned
          ? "Razorpay returned to the app. Payment confirmation is still being verified securely by Oasis."
          : `${checkoutMessage ?? "Razorpay checkout did not complete."} Refresh payment status before retrying.`,
      };
    }

    const terminal = isTerminalPaymentStatus(status.status);
    if (terminal === "success") {
      await clearPaymentIdempotencyKey(input.orderId, input.paymentPurpose).catch(() => undefined);
      return {
        phase: "succeeded",
        paymentIntentId: providerOrder.intentId,
        providerOrderId: status.provider_order_id,
        status,
        message: "Payment status confirmed by Core after provider verification.",
      };
    }

    if (terminal === "failure") {
      return {
        phase: "failed",
        paymentIntentId: providerOrder.intentId,
        providerOrderId: status.provider_order_id,
        status,
        message: "The provider reported that this payment did not complete. You can retry when ready.",
      };
    }

    return {
      phase: "awaiting_gateway",
      paymentIntentId: providerOrder.intentId,
      providerOrderId: status.provider_order_id ?? providerOrder.providerOrderId,
      status,
      message: checkoutReturned
        ? "Razorpay returned to the app. Payment confirmation is verified securely by the server; refresh if it remains pending."
        : `${checkoutMessage ?? "Razorpay checkout did not complete."} No payment is marked successful unless Core verifies the provider webhook.`,
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
