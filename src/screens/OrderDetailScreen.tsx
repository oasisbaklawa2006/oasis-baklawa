import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCustomerOrderItems, fetchCustomerOrderStatus } from "@/lib/api/orders";
import { formatInr } from "@/lib/customer-projections";
import { FULFILMENT_TIMELINE_STAGES, fulfilmentStageIndex } from "@/lib/order-stages";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerFinanceFacts, CustomerOrderItem, CustomerOrderStatus } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetail">;

export function OrderDetailScreen({ navigation, route }: Props) {
  const { orderId, order: initialOrder } = route.params;
  const [order, setOrder] = useState<CustomerOrderStatus | null>(initialOrder ?? null);
  const [items, setItems] = useState<CustomerOrderItem[]>([]);
  const [financeFacts, setFinanceFacts] = useState<CustomerFinanceFacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allItems = await fetchCustomerOrderItems();
      setItems(allItems.filter((i) => i.order_id === orderId));
      if (initialOrder) {
        setOrder(initialOrder);
      } else {
        const orders = await fetchCustomerOrderStatus();
        setOrder(orders.find((o) => o.order_id === orderId) ?? null);
      }
      try {
        setFinanceFacts(await customerGateway.financeFacts(orderId));
      } catch {
        setFinanceFacts(null);
      }
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, [orderId, initialOrder]);

  useEffect(() => {
    load();
  }, [load]);

  const stageIndex = useMemo(() => {
    if (!order) return -1;
    return fulfilmentStageIndex(order.customer_stage);
  }, [order]);

  return (
    <Screen title="Order Detail" subtitle={order?.order_number ?? ""}>
      <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
        <Text style={styles.back}>‹ Back to orders</Text>
      </TouchableOpacity>
      {loading ? (
        <LoadingState message="Loading order…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !order ? (
        <ErrorState message="Order not found." onRetry={load} />
      ) : (
        <View style={styles.body}>
          <View style={styles.summary}>
            <Text style={styles.value}>₹{order.order_value.toLocaleString("en-IN")}</Text>
            <Text style={styles.meta}>
              {order.customer_stage.replace(/_/g, " ")} · {order.payment_stage.replace(/_/g, " ")}
            </Text>
          </View>
          <Text style={styles.section}>Fulfilment timeline</Text>
          {FULFILMENT_TIMELINE_STAGES.map((stage, index) => (
            <View key={stage.key} style={styles.timelineRow}>
              <View style={[styles.dot, stageIndex >= 0 && index <= stageIndex && styles.dotActive]} />
              <Text style={[styles.timelineLabel, stageIndex >= 0 && index <= stageIndex && styles.timelineLabelActive]}>
                {stage.label}
              </Text>
            </View>
          ))}
          {order.tracking_number ? (
            <Text style={styles.tracking}>
              {order.courier_name ?? "Courier"} · AWB {order.tracking_number}
            </Text>
          ) : null}
          {financeFacts?.customer_safe_projection ? (
            <View style={styles.financeCard}>
              <Text style={styles.section}>Finance facts</Text>
              <Text style={styles.financeMeta}>
                {financeFacts.finance_status?.replace(/_/g, " ") ?? "Status pending"}
              </Text>
              {financeFacts.commercial_value !== null ? (
                <Text style={styles.financeLine}>Commercial value: {formatInr(financeFacts.commercial_value)}</Text>
              ) : null}
              {financeFacts.required_advance !== null ? (
                <Text style={styles.financeLine}>Required advance: {formatInr(financeFacts.required_advance)}</Text>
              ) : null}
              {financeFacts.covered_amount !== null ? (
                <Text style={styles.financeLine}>Covered amount: {formatInr(financeFacts.covered_amount)}</Text>
              ) : null}
              {financeFacts.pi_number ? (
                <Text style={styles.financeLine}>PI reference: {financeFacts.pi_number}</Text>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.section}>Line items</Text>
          <FlatList
            data={items}
            scrollEnabled={false}
            keyExtractor={(item) => item.item_id}
            ListEmptyComponent={<Text style={styles.empty}>No line items returned for this order.</Text>}
            renderItem={({ item }) => (
              <View style={styles.line}>
                <Text style={styles.lineTitle}>{item.product_name}</Text>
                <Text style={styles.lineMeta}>
                  {item.quantity} {item.pack_size ?? "units"} · {item.sku}
                </Text>
              </View>
            )}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { fontFamily: typography.fontFamilySansMedium, color: colors.action, marginTop: spacing.sm },
  body: { marginTop: spacing.md, gap: spacing.sm },
  summary: { backgroundColor: colors.surfacePremium, borderRadius: 12, padding: spacing.lg },
  value: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeXxl, color: colors.textPrimary },
  meta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted, marginTop: 4 },
  section: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeLg, color: colors.textPrimary, marginTop: spacing.md },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.action },
  timelineLabel: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  timelineLabelActive: { color: colors.textPrimary, fontFamily: typography.fontFamilySansSemiBold },
  tracking: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, marginTop: spacing.md },
  financeCard: { backgroundColor: colors.surfacePremium, borderRadius: 12, padding: spacing.md, marginTop: spacing.md, gap: 4 },
  financeMeta: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  financeLine: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  line: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  lineTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  lineMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 2 },
  empty: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
});
