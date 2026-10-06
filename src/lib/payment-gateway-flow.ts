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
import { preparePaymentProviderSession } from "@/lib/payment-provider-runtime";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerFinanceFacts } from "@/types/database.types";
import {
  DEFAULT_PAYMENT_PROVIDER_CODE,
  type CreatePaymentGatewayIntentInput,
  type PaymentGatewayPayableStatus,
  type PaymentGatewayPurpose,
} from "@/types/payment-gateway-contract";

export type PaymentFlowPhase =
  | "idle"
  | "creating_intent"
  | "awaiting_gateway"
  | "polling"
  | "succeeded"
  | "failed";

export interface PaymentFlowState {
  phase: PaymentFlowPhase;
  paymentIntentId: string | null;
  providerOrderId: string | null;
  status: PaymentGatewayPayableStatus | null;
  message: string | null;
  checkoutUrl?: string | null;
}

export interface InitiatePaymentInput {
  orderId: string;
  piId: string;
  commercialVersionId: string;
  paymentPurpose: PaymentGatewayPurpose;
}

async function terminalFlowFromStatus(
  status: PaymentGatewayPayableStatus | null,
  orderId: string,
  paymentPurpose: PaymentGatewayPurpose,
  paymentIntentId: string,
  providerOrderId: string | null
): Promise<PaymentFlowState | null> {
  const terminal = status ? isTerminalPaymentStatus(status.status) : null;
  if (terminal === "success") {
    await clearPaymentIdempotencyKey(orderId, paymentPurpose).catch(() => undefined);
    return {
      phase: "succeeded",
      paymentIntentId,
      providerOrderId,
      status,
      message: "Payment status confirmed by Core.",
      checkoutUrl: null,
    };
  }
  if (terminal === "failure") {
    return {
      phase: "failed",
      paymentIntentId,
      providerOrderId,
      status,
      message: "Core confirmed that the payment did not complete.",
      checkoutUrl: null,
    };
  }
  return null;
}

export async function initiateGovernedPayment(
  input: InitiatePaymentInput
): Promise<PaymentFlowState> {
  const resolved = await resolvePaymentIdempotencyKey(
    input.orderId,
    input.paymentPurpose
  );
  if (!resolved.key || !resolved.persisted) {
    return {
      phase: "failed",
      paymentIntentId: null,
      providerOrderId: null,
      status: null,
      message:
        "Could not persist your payment attempt locally. Retry when storage is available.",
      checkoutUrl: null,
    };
  }

  const correlationId = createIdempotencyKey();

  try {
    const session = await preparePaymentProviderSession({
      ...input,
      correlationId,
      idempotencyKey: resolved.key,
    });
    const status = await fetchPaymentGatewayPayableStatus(session.intentId).catch(
      () => null
    );
    const terminal = await terminalFlowFromStatus(
      status,
      input.orderId,
      input.paymentPurpose,
      session.intentId,
      session.providerOrderId
    );
    if (terminal) return terminal;

    return {
      phase: "awaiting_gateway",
      paymentIntentId: session.intentId,
      providerOrderId: session.providerOrderId,
      status,
      message:
        "Secure checkout is ready. Payment remains pending until Core receives and verifies the provider confirmation.",
      checkoutUrl: session.checkoutUrl,
    };
  } catch {
    // The hosted provider layer is deliberately optional and fail-closed. Core
    // may still create the canonical intent so status remains auditable, but
    // no provider checkout and no payment success is inferred locally.
    try {
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
      const status = await fetchPaymentGatewayPayableStatus(intent.intent_id).catch(
        () => null
      );
      const terminal = await terminalFlowFromStatus(
        status,
        input.orderId,
        input.paymentPurpose,
        intent.intent_id,
        status?.provider_order_id ?? null
      );
      if (terminal) return terminal;

      return {
        phase: "awaiting_gateway",
        paymentIntentId: intent.intent_id,
        providerOrderId: status?.provider_order_id ?? null,
        status,
        message:
          "Online payment gateway is inactive or unavailable. No payment has been marked successful.",
        checkoutUrl: null,
      };
    } catch (error) {
      return {
        phase: "failed",
        paymentIntentId: null,
        providerOrderId: null,
        status: null,
        message: parseRpcError(error).message,
        checkoutUrl: null,
      };
    }
  }
}

export async function refreshPaymentIntentStatus(
  paymentIntentId: string,
  orderId: string,
  paymentPurpose: PaymentGatewayPurpose = "advance"
): Promise<{
  flow: PaymentFlowState;
  financeFacts: CustomerFinanceFacts | null;
}> {
  try {
    const status = await fetchPaymentGatewayPayableStatus(paymentIntentId);
    const terminal = isTerminalPaymentStatus(status.status);

    if (terminal === "success") {
      await clearPaymentIdempotencyKey(orderId, paymentPurpose).catch(
        () => undefined
      );
      return {
        flow: {
          phase: "succeeded",
          paymentIntentId,
          providerOrderId: status.provider_order_id,
          status,
          message: "Payment status confirmed by Core. Finance facts will refresh.",
          checkoutUrl: null,
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
          checkoutUrl: null,
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
        checkoutUrl: null,
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
        checkoutUrl: null,
      },
      financeFacts: null,
    };
  }
}
