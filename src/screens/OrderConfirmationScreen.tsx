import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCustomerOrderStatus } from "@/lib/api/orders";
import { derivePayableState } from "@/lib/payment-gateway-boundary";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerOrderStatus } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "OrderConfirmation">;

/** Dedicated post-submit confirmation using server-authoritative order and finance facts. */
export function OrderConfirmationScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<CustomerOrderStatus | null>(null);
  const [payableAmount, setPayableAmount] = useState<number | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFinanceError(null);
    try {
      const [orders, finance] = await Promise.all([
        fetchCustomerOrderStatus(),
        customerGateway.financeFacts(orderId).catch((e) => {
          setFinanceError(parseRpcError(e).message);
          return null;
        }),
      ]);
      setOrder(orders.find((item) => item.order_id === orderId) ?? null);
      const payable = derivePayableState(finance);
      setPayableAmount(payable?.payableAmount ?? null);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen title="Order confirmed" subtitle="Thank you. Your order has been received.">
      {loading ? <LoadingState message="Confirming your order…" /> : null}
      {error && !loading ? <ErrorState message={error} onRetry={load} /> : null}
      {financeError && !loading && !error ? <ErrorState message={financeError} onRetry={load} /> : null}
      {!loading && !error && !order ? <ErrorState message="We could not load this order yet." onRetry={load} /> : null}
      {order ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>ORDER CONFIRMED</Text>
            <Text style={styles.orderNumber}>#{order.order_number}</Text>
            <Text style={styles.value}>₹{order.order_value.toLocaleString("en-IN")}</Text>
            <Text style={styles.copy}>Your order is safely recorded. We will show only the next action needed from you.</Text>
          </View>
          {payableAmount !== null && payableAmount > 0 ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Your order is ready to proceed</Text>
              <Text style={styles.actionCopy}>Complete the required payment so we can continue preparing your order.</Text>
              <OasisButton
                label={`Pay ₹${payableAmount.toLocaleString("en-IN")}`}
                onPress={() => navigation.navigate("OrderPayment", { orderId, orderNumber: order.order_number })}
              />
            </View>
          ) : null}
          <OasisButton
            label="View order"
            variant="secondary"
            onPress={() => navigation.navigate("OrderDetail", { orderId, order })}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.lg, backgroundColor: colors.surfacePremium, borderRadius: 18, padding: spacing.lg },
  eyebrow: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXs, color: colors.accentGold, letterSpacing: 1.2 },
  orderNumber: { marginTop: spacing.sm, fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeXxl, color: colors.textPrimary },
  value: { marginTop: spacing.sm, fontFamily: typography.fontFamilySansBold, fontSize: typography.sizeXl, color: colors.textPrimary },
  copy: { marginTop: spacing.md, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, lineHeight: 20 },
  actionCard: { marginVertical: spacing.lg, gap: spacing.md },
  actionTitle: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeLg, color: colors.textPrimary },
  actionCopy: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, lineHeight: 20 },
});
