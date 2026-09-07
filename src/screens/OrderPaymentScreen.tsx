import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useNetwork } from "@/context/NetworkContext";
import { formatInr } from "@/lib/customer-projections";
import { resolvePaymentGatewayBoundary } from "@/lib/payment-gateway-boundary";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerFinanceFacts } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "OrderPayment">;

/** Allowed governed RPCs mirrored from verify-contract-boundary for fail-closed gateway checks. */
const BOUNDARY_ALLOWLIST = [
  "calculate_customer_advance_v1",
  "customer_order_finance_facts_v1",
  "create_customer_payment_intent_v1",
  "customer_payment_intent_status_v1",
];

export function OrderPaymentScreen({ navigation, route }: Props) {
  const { orderId, orderNumber } = route.params;
  const { isOnline } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [financeFacts, setFinanceFacts] = useState<CustomerFinanceFacts | null>(null);

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
    () => resolvePaymentGatewayBoundary(financeFacts, BOUNDARY_ALLOWLIST, { isOnline }),
    [financeFacts, isOnline]
  );

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
          loading={refreshing}
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

            {boundary.blockedReason ? (
              <Text style={styles.note} accessibilityRole="alert">
                {boundary.blockedReason}
              </Text>
            ) : null}

            <Text style={styles.note}>
              Buyer never creates payment success locally. Gateway intent/status will be consumed from Core once bound; there is no simulated success path.
            </Text>

            <OasisButton
              label={boundary.canInitiatePayment ? "Initiate advance payment" : "Payment initiation unavailable"}
              onPress={() => undefined}
              disabled={!boundary.canInitiatePayment}
              accessibilityHint="Disabled until Core payment gateway contracts are bound and online"
            />

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
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  rowLabel: { flex: 1, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  rowValue: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  rowValueEmphasis: { color: colors.action, fontSize: typography.sizeLg },
  note: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, lineHeight: 18 },
});
