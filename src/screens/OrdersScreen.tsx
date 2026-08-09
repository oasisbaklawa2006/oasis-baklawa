import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCustomerOrderItems, fetchCustomerOrderStatus } from "@/lib/api/orders";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerOrderItem, CustomerOrderStatus } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Orders">,
  NativeStackScreenProps<RootStackParamList>
>;

const TIMELINE_STAGES = [
  { key: "order_received", label: "Order Received" },
  { key: "payment_pending", label: "Payment Pending" },
  { key: "in_production", label: "In Production" },
  { key: "packing", label: "Packing" },
  { key: "ready_for_dispatch", label: "Ready for Dispatch" },
  { key: "dispatched", label: "Dispatched" },
  { key: "processing", label: "Processing" },
];

function stageIndex(stage: string): number {
  const idx = TIMELINE_STAGES.findIndex((s) => s.key === stage);
  return idx === -1 ? 0 : idx;
}

function istStagnancy(updatedAt: string): string {
  const updated = new Date(updatedAt).getTime();
  const now = Date.now();
  const hours = Math.max(0, Math.floor((now - updated) / (1000 * 60 * 60)));
  return `${hours}h in current stage (IST)`;
}

export function OrdersScreen({ navigation, route }: Props) {
  const checkoutSuccess = route.params?.checkoutSuccess;
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);
  const [items, setItems] = useState<CustomerOrderItem[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRows, itemRows] = await Promise.all([fetchCustomerOrderStatus(), fetchCustomerOrderItems()]);
      setOrders(orderRows);
      setItems(itemRows);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const itemsByOrder = useMemo(() => {
    const map = new Map<string, CustomerOrderItem[]>();
    items.forEach((item) => {
      const list = map.get(item.order_id) ?? [];
      list.push(item);
      map.set(item.order_id, list);
    });
    return map;
  }, [items]);

  async function onRefresh() {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Orders" subtitle="Customer-safe order projections" scroll={false}>
        {checkoutSuccess ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>
              {checkoutSuccess.isDuplicateSubmission ? "Order already submitted" : "Sales Order created"}
            </Text>
            <Text style={styles.successLine}>SO #{checkoutSuccess.orderNumber}</Text>
            <Text style={styles.successLine}>
              Value ₹{checkoutSuccess.salesOrderValue.toLocaleString("en-IN")} · Advance ₹
              {checkoutSuccess.advanceRequired.toLocaleString("en-IN")}
            </Text>
          </View>
        ) : null}

        {error ? <ErrorState message={error} onRetry={loadOrders} /> : null}

        {loading ? (
          <LoadingState message="Loading orders…" />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.order_id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<EmptyState title="No orders yet" message="Submitted Sales Orders will appear here." />}
          renderItem={({ item }) => {
            const activeStage = stageIndex(item.customer_stage);
            const orderItems = itemsByOrder.get(item.order_id) ?? [];
            const expanded = expandedOrderId === item.order_id;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("OrderDetail", { orderId: item.order_id })}
                accessibilityRole="button"
                accessibilityLabel={`Order ${item.order_number}`}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.orderNumber}>#{item.order_number}</Text>
                  <Text style={styles.orderValue}>₹{item.order_value.toLocaleString("en-IN")}</Text>
                </View>
                <Text style={styles.stageMeta}>
                  {item.customer_stage.replace(/_/g, " ")} · {item.payment_stage.replace(/_/g, " ")}
                </Text>
                <Text style={styles.stagnancy}>{istStagnancy(item.updated_at)}</Text>

                <View style={styles.timeline}>
                  {TIMELINE_STAGES.map((stage, index) => (
                    <View key={stage.key} style={styles.timelineRow}>
                      <View style={[styles.dot, index <= activeStage && styles.dotActive]} />
                      <Text style={[styles.timelineLabel, index <= activeStage && styles.timelineLabelActive]}>{stage.label}</Text>
                    </View>
                  ))}
                </View>

                {item.requested_dispatch_date ? (
                  <Text style={styles.dispatchDate}>Requested dispatch: {item.requested_dispatch_date}</Text>
                ) : null}

                {item.tracking_number ? (
                  <Text style={styles.tracking}>
                    {item.courier_name ?? "Courier"} · AWB {item.tracking_number}
                  </Text>
                ) : null}

                {orderItems.length > 0 ? (
                  <TouchableOpacity onPress={() => setExpandedOrderId(expanded ? null : item.order_id)}>
                    <Text style={styles.itemsToggle}>{expanded ? "Hide line items" : "Show line items"}</Text>
                  </TouchableOpacity>
                ) : null}

                {expanded
                  ? orderItems.map((line) => (
                      <Text key={line.item_id} style={styles.itemLine}>
                        {line.product_name} · {line.quantity} {line.pack_size ?? "units"} · {line.sku}
                      </Text>
                    ))
                  : null}
              </TouchableOpacity>
            );
          }}
        />
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.md, gap: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  orderNumber: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  orderValue: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.action },
  stageMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 4 },
  stagnancy: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.warning, marginTop: 4 },
  timeline: { marginTop: 14, gap: spacing.sm },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.action },
  timelineLabel: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  timelineLabelActive: { fontFamily: typography.fontFamilySansSemiBold, color: colors.textPrimary },
  dispatchDate: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textSecondary, marginTop: 10 },
  tracking: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: spacing.md },
  itemsToggle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.action, marginTop: spacing.md },
  itemLine: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textSecondary, marginTop: 4 },
  successCard: { backgroundColor: colors.successSurface, borderRadius: 12, padding: 14, marginBottom: spacing.md },
  successTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.success },
  successLine: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textPrimary, marginTop: 4 },
});
