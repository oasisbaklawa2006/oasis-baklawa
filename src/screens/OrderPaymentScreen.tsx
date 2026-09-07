import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useNetwork } from "@/context/NetworkContext";
import { formatInr } from "@/lib/customer-projections";
import {
  initiateAdvancePayment,
  refreshPaymentIntentStatus,
  type PaymentFlowState,
} from "@/lib/payment-gateway-flow";
import { resolvePaymentGatewayBoundary } from "@/lib/payment-gateway-boundary";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerFinanceFacts } from "@/types/database.types";
import { BUYER_BOUND_PAYMENT_GATEWAY_RPCS } from "@/types/payment-gateway-contract";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "OrderPayment">;

export function OrderPaymentScreen({ navigation, route }: Props) {
  const { orderId, orderNumber } = route.params;
  const { isOnline } = useNetwork();
  const submitInFlightRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [financeFacts, setFinanceFacts] = useState<CustomerFinanceFacts | null>(null);
  const [flow, setFlow] = useState<PaymentFlowState>({
    phase: "idle",
    paymentIntentId: null,
    gatewayCheckoutUrl: null,
    status: null,
    message: null,
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      setFinanceFacts(await customerGateway.financeFacts(orderId));
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
    () => resolvePaymentGatewayBoundary(financeFacts, BUYER_BOUND_PAYMENT_GATEWAY_RPCS, { isOnline }),
    [financeFacts, isOnline]
  );

  async function onInitiatePayment() {
    if (!boundary.canInitiatePayment || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setSubmitting(true);
    setFlow((prev) => ({ ...prev, phase: "creating_intent", message: null }));
    try {
      const nextFlow = await initiateAdvancePayment(orderId);
      setFlow(nextFlow);
      if (nextFlow.phase === "succeeded" || nextFlow.phase === "awaiting_gateway") {
        await load();
      }
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  async function onRefreshPaymentStatus() {
    if (!flow.paymentIntentId) return;
    setRefreshing(true);
    try {
      const { flow: nextFlow } = await refreshPaymentIntentStatus(flow.paymentIntentId, orderId);
      setFlow(nextFlow);
      await load();
    } finally {
      setRefreshing(false);
    }
  }

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
              <Row label="Commercial value" value={formatInr(boundary.payable.commercialValue)} />
              <Row label="Required advance" value={formatInr(boundary.payable.requiredAdvance)} emphasis />
              <Row label="Verified payments" value={formatInr(boundary.payable.verifiedPaymentAmount)} />
              <Row label="Covered amount" value={formatInr(boundary.payable.coveredAmount)} />
              <Row label="Balance due" value={formatInr(boundary.payable.balanceDue)} />
              {boundary.payable.piNumber ? <Row label="PI reference" value={boundary.payable.piNumber} /> : null}
              {boundary.payable.piStatus ? <Row label="PI status" value={boundary.payable.piStatus.replace(/_/g, " ")} /> : null}
            </View>

            {flow.status ? (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>Gateway status</Text>
                <Text style={styles.statusMeta}>{flow.status.status.replace(/_/g, " ")}</Text>
                {flow.status.verified_amount !== null ? (
                  <Text style={styles.statusMeta}>Verified amount {formatInr(flow.status.verified_amount)}</Text>
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
              Buyer never marks payment success locally. Intent creation and status polling consume Core gateway contracts only.
            </Text>

            <OasisButton
              label={submitting ? "Creating payment intent…" : "Initiate advance payment"}
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
