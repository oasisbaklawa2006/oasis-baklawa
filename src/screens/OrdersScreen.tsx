import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { supabase } from "@/lib/supabase";
import type { CustomerOrderStatus } from "@/types/database.types";

type Props = NativeStackScreenProps<RootStackParamList, "Orders">;

const TIMELINE_STAGES = [
  "Order Confirmed",
  "Advance Received",
  "Production Queued",
  "Ingredients Prepped",
  "Artisan Crafting",
  "Quality Check",
  "Packed",
  "Dispatch Ready",
  "In Transit",
  "Delivered",
];

function stageIndex(stage: string): number {
  const idx = TIMELINE_STAGES.findIndex((s) => s.toLowerCase() === stage.toLowerCase());
  return idx === -1 ? 0 : idx;
}

function istStagnancy(updatedAt: string): string {
  const updated = new Date(updatedAt).getTime();
  const now = Date.now();
  const hours = Math.max(0, Math.floor((now - updated) / (1000 * 60 * 60)));
  return `${hours}h in current stage (IST)`;
}

export function OrdersScreen({}: Props) {
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("customer_order_status_v1");
      setOrders(data ?? []);
    })();
  }, []);

  return (
    <Screen title="Orders" subtitle="Live artisan tracking timeline" scroll={false}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.order_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
        renderItem={({ item }) => {
          const activeStage = stageIndex(item.customer_stage);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNumber}>#{item.order_number}</Text>
                <Text style={styles.orderValue}>₹{item.order_value.toLocaleString("en-IN")}</Text>
              </View>
              <Text style={styles.stagnancy}>{istStagnancy(item.updated_at)}</Text>

              <View style={styles.timeline}>
                {TIMELINE_STAGES.map((stage, index) => (
                  <View key={stage} style={styles.timelineRow}>
                    <View style={[styles.dot, index <= activeStage && styles.dotActive]} />
                    <Text style={[styles.timelineLabel, index <= activeStage && styles.timelineLabelActive]}>{stage}</Text>
                  </View>
                ))}
              </View>

              {item.tracking_number && (
                <Text style={styles.tracking}>
                  {item.courier_name ?? "Courier"} · AWB {item.tracking_number}
                </Text>
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 12, gap: 20 },
  card: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#F0DED0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  orderNumber: { fontSize: 15, fontWeight: "700", color: "#3A2A22" },
  orderValue: { fontSize: 15, fontWeight: "700", color: "#7A1B2B" },
  stagnancy: { fontSize: 11, color: "#B26A00", marginTop: 4 },
  timeline: { marginTop: 14, gap: 8 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#F0DED0" },
  dotActive: { backgroundColor: "#7A1B2B" },
  timelineLabel: { fontSize: 12, color: "#B0A296" },
  timelineLabelActive: { color: "#3A2A22", fontWeight: "600" },
  tracking: { fontSize: 11, color: "#8A6B5C", marginTop: 12 },
  empty: { fontSize: 13, color: "#8A6B5C", textAlign: "center", paddingVertical: 20 },
});
