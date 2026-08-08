import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { fetchCustomerOrderItems, fetchCustomerOrderStatus } from "@/lib/api/orders";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerOrderItem, CustomerOrderStatus } from "@/types/database.types";

type Props = NativeStackScreenProps<RootStackParamList, "Orders">;

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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color="#7A1B2B" style={styles.loader} />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.order_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
          renderItem={({ item }) => {
            const activeStage = stageIndex(item.customer_stage);
            const orderItems = itemsByOrder.get(item.order_id) ?? [];
            const expanded = expandedOrderId === item.order_id;
            return (
              <View style={styles.card}>
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
              </View>
            );
          }}
        />
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 12, gap: 20 },
  card: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#F0DED0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  orderNumber: { fontSize: 15, fontWeight: "700", color: "#3A2A22" },
  orderValue: { fontSize: 15, fontWeight: "700", color: "#7A1B2B" },
  stageMeta: { fontSize: 11, color: "#8A6B5C", marginTop: 4 },
  stagnancy: { fontSize: 11, color: "#B26A00", marginTop: 4 },
  timeline: { marginTop: 14, gap: 8 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#F0DED0" },
  dotActive: { backgroundColor: "#7A1B2B" },
  timelineLabel: { fontSize: 12, color: "#B0A296" },
  timelineLabelActive: { color: "#3A2A22", fontWeight: "600" },
  dispatchDate: { fontSize: 11, color: "#5A4438", marginTop: 10 },
  tracking: { fontSize: 11, color: "#8A6B5C", marginTop: 12 },
  itemsToggle: { fontSize: 12, color: "#7A1B2B", fontWeight: "700", marginTop: 12 },
  itemLine: { fontSize: 11, color: "#5A4438", marginTop: 4 },
  empty: { fontSize: 13, color: "#8A6B5C", textAlign: "center", paddingVertical: 20 },
  error: { color: "#B3261E", marginBottom: 8 },
  successCard: { backgroundColor: "#E8F3E8", borderRadius: 12, padding: 14, marginBottom: 12 },
  successTitle: { fontSize: 14, fontWeight: "700", color: "#2E7D32" },
  successLine: { fontSize: 13, color: "#3A2A22", marginTop: 4 },
  loader: { marginTop: 24 },
});
