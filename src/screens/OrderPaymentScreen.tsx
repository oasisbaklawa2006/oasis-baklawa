import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useNetwork } from "@/context/NetworkContext";
import { fetchCustomerFinalPaymentRequest } from "@/lib/api/final-payment";
import { formatInr } from "@/lib/customer-projections";
import { initiateGovernedPayment, refreshPaymentIntentStatus, type PaymentFlowState } from "@/lib/payment-gateway-flow";
import { resolvePaymentGatewayBoundary } from "@/lib/payment-gateway-boundary";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerFinalPaymentRequest, CustomerFinanceFacts } from "@/types/database.types";
import type { PaymentGatewayPurpose } from "@/types/payment-gateway-contract";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "OrderPayment">;

function purposeLabel(purpose: PaymentGatewayPurpose | null | undefined): string {
  switch (purpose) {
    case "advance":
      return "Advance payment";
    case "balance":
      return "Balance payment";
    case "final_payment":
      return "Final payment";
    default:
      return "Payment";
  }
}

export function OrderPaymentScreen({ navigation, route }: Props) {
  const { orderId, orderNumber } = route.params;
  const { isOnline } = useNetwork();
  const submitInFlightRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [financeFacts, setFinanceFacts] = useState<CustomerFinanceFacts | null>(null);
  const [finalPayment, setFinalPayment] = useState<CustomerFinalPaymentRequest | null>(null);
  const [finalPaymentResolved, setFinalPaymentResolved] = useState(false);
  const [finalPaymentLoadError, setFinalPaymentLoadError] = useState<string | null>(null);
  const [flow, setFlow] = useState<PaymentFlowState>({
    phase: "idle",
    paymentIntentId: null,
    providerOrderId: null,
    status: null,
    message: null,
  });

  const load = useCallback(async () => {
    setError(null);
    setFinalPaymentResolved(false);
    setFinalPaymentLoadError(null);
    try {
      const facts = await customerGateway.financeFacts(orderId);
      setFinanceFacts(facts);

      try {
        const finalPaymentFacts = await fetchCustomerFinalPaymentRequest(orderId);
        setFinalPayment(finalPaymentFacts);
        setFinalPaymentLoadError(null);
      } catch (e) {
        setFinalPayment(null);
        setFinalPaymentLoadError(parseRpcError(e).message);
      } finally {
        setFinalPaymentResolved(true);
      }
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const boundary = useMemo(
    () =>
      resolvePaymentGatewayBoundary(financeFacts, {
        isOnline,
        finalPayment,
        finalPaymentLoadError,
        finalPaymentResolved,
      }),
    [financeFacts, finalPayment, finalPaymentLoadError, finalPaymentResolved, isOnline]
  );

  async function onInitiatePayment() {
    if (!boundary.canInitiatePayment || !boundary.payable?.paymentPurpose || submitInFlightRef.current) return;
    if (!boundary.payable.piId || !boundary.payable.commercialVersionId) return;

    submitInFlightRef.current = true;
    setSubmitting(true);
    setFlow((prev) => ({ ...prev, phase: "creating_intent", message: null }));
    try {
      const nextFlow = await initiateGovernedPayment({
        orderId,
        piId: boundary.payable.piId,
        commercialVersionId: boundary.payable.commercialVersionId,
        paymentPurpose: boundary.payable.paymentPurpose,
      });
      setFlow(nextFlow);
      if (nextFlow.phase === "succeeded" || nextFlow.phase === "awaiting_gateway") {
        await load();
      }
    } catch (e) {
      setFlow((prev) => ({
        ...prev,
        phase: "failed",
        message: parseRpcError(e).message,
      }));
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  async function onRefreshPaymentStatus() {
    if (!flow.paymentIntentId || !boundary.payable?.paymentPurpose) return;
    setRefreshing(true);
    try {
      const { flow: nextFlow } = await refreshPaymentIntentStatus(
        flow.paymentIntentId,
        orderId,
        boundary.payable.paymentPurpose
      );
      setFlow(nextFlow);
      await load();
    } catch (e) {
      setFlow((prev) => ({
        ...prev,
        phase: "failed",
        message: parseRpcError(e).message,
      }));
    } finally {
      setRefreshing(false);
    }
  }

  const initiateLabel = boundary.payable?.paymentPurpose
    ? `Initiate ${purposeLabel(boundary.payable.paymentPurpose).toLowerCase()}`
    : "Initiate payment";

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Order payment" subtitle={orderNumber} safeAreaEdges={["top", "bottom"]}>
        <OasisButton
          label="Refresh finance facts"
          variant="secondary"
          onPress={() => {
            setRefreshing(true);
            void load();
          }}
          loading={refreshing && !flow.paymentIntentId}
        />
        {loading ? (
          <LoadingState message="Loading server-authoritative payable state…" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />
        ) : !boundary.payable ? (
          <ErrorState message={boundary.blockedReason ?? "Payable state unavailable."} onRetry={() => { setLoading(true); void load(); }} />
        ) : (
          <View style={styles.body}>
            <View style={styles.card}>
              <Row label="Finance status" value={(boundary.payable.financeStatus ?? "pending").replace(/_/g, " ")} />
              <Row label="Payment purpose" value={purposeLabel(boundary.payable.paymentPurpose)} />
              <Row label="Commercial value" value={formatInr(boundary.payable.commercialValue)} />
              <Row label="Required advance" value={formatInr(boundary.payable.requiredAdvance)} />
              <Row label="Verified payments" value={formatInr(boundary.payable.verifiedPaymentAmount)} />
              <Row label="Covered amount" value={formatInr(boundary.payable.coveredAmount)} />
              <Row label="Balance due" value={formatInr(boundary.payable.balanceDue)} />
              <Row label="Payable now" value={formatInr(boundary.payable.payableAmount)} emphasis />
              {boundary.payable.piNumber ? <Row label="PI reference" value={boundary.payable.piNumber} /> : null}
              {boundary.payable.piStatus ? <Row label="PI status" value={boundary.payable.piStatus.replace(/_/g, " ")} /> : null}
              {boundary.payable.finalPaymentStatus ? (
                <Row label="Final payment status" value={boundary.payable.finalPaymentStatus.replace(/_/g, " ")} />
              ) : null}
            </View>

            {boundary.payable.finalPaymentInstructions ? (
              <Text style={styles.note}>{boundary.payable.finalPaymentInstructions}</Text>
            ) : null}

            {flow.status ? (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>Gateway status</Text>
                <Text style={styles.statusMeta}>{flow.status.status.replace(/_/g, " ")}</Text>
                <Text style={styles.statusMeta}>Amount {formatInr(flow.status.canonical_amount)}</Text>
                {flow.providerOrderId ? (
                  <Text style={styles.statusMeta}>Provider order {flow.providerOrderId}</Text>
                ) : null}
              </View>
            ) : null}

            {boundary.blockedReason ? (
              <Text style={styles.note} accessibilityRole="alert">
                {boundary.blockedReason}
              </Text>
            ) : null}

            {flow.message ? (
              <Text style={styles.note} accessibilityRole="alert">
                {flow.message}
              </Text>
            ) : null}

            <Text style={styles.note}>
              Buyer never marks payment success locally. Intent creation and status polling consume Core #255 gateway contracts only.
            </Text>

            <OasisButton
              label={submitting ? "Creating payment intent…" : initiateLabel}
              onPress={() => void onInitiatePayment()}
              disabled={!boundary.canInitiatePayment || submitting}
              loading={submitting}
            />

            {flow.paymentIntentId ? (
              <OasisButton
                label="Refresh gateway status"
                variant="secondary"
                onPress={() => void onRefreshPaymentStatus()}
                loading={refreshing}
              />
            ) : null}

            <OasisButton label="View documents" variant="secondary" onPress={() => navigation.navigate("Documents")} />
          </View>
        )}
      </Screen>
    </BuyerGate>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.md, gap: spacing.md },
  card: { backgroundColor: colors.surfacePremium, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  statusCard: { backgroundColor: colors.surfaceUtility, borderRadius: 12, padding: spacing.md, gap: 4 },
  statusTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  statusMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  rowLabel: { flex: 1, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  rowValue: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  rowValueEmphasis: { color: colors.action, fontSize: typography.sizeLg },
  note: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, lineHeight: 18 },
});
