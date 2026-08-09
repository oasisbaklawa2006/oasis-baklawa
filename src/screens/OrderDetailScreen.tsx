import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCustomerOrderItems, fetchCustomerOrderStatus } from "@/lib/api/orders";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerOrderItem, CustomerOrderStatus } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetail">;

const TIMELINE_STAGES = [
  "order_received",
  "payment_pending",
  "in_production",
  "packing",
  "ready_for_dispatch",
  "dispatched",
  "delivered",
];

export function OrderDetailScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<CustomerOrderStatus | null>(null);
  const [items, setItems] = useState<CustomerOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orders, allItems] = await Promise.all([fetchCustomerOrderStatus(), fetchCustomerOrderItems()]);
      setOrder(orders.find((o) => o.order_id === orderId) ?? null);
      setItems(allItems.filter((i) => i.order_id === orderId));
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const stageIndex = useMemo(() => {
    if (!order) return -1;
    return TIMELINE_STAGES.indexOf(order.customer_stage);
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
          {TIMELINE_STAGES.map((stage, index) => (
            <View key={stage} style={styles.timelineRow}>
              <View style={[styles.dot, index <= stageIndex && styles.dotActive]} />
              <Text style={[styles.timelineLabel, index <= stageIndex && styles.timelineLabelActive]}>
                {stage.replace(/_/g, " ")}
              </Text>
            </View>
          ))}
          {order.tracking_number ? (
            <Text style={styles.tracking}>
              {order.courier_name ?? "Courier"} · AWB {order.tracking_number}
            </Text>
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
  timelineLabel: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted, textTransform: "capitalize" },
  timelineLabelActive: { color: colors.textPrimary, fontFamily: typography.fontFamilySansSemiBold },
  tracking: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, marginTop: spacing.md },
  line: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  lineTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  lineMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 2 },
  empty: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
});
