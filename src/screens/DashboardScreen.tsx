import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { fetchCustomerTeam } from "@/lib/api/buyer";
import { fetchCustomerOrderStatus } from "@/lib/api/orders";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerTeamMember } from "@/types/database.types";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const [lifetimeValue, setLifetimeValue] = useState<number | null>(null);
  const [team, setTeam] = useState<CustomerTeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const orders = await fetchCustomerOrderStatus();
        const total = orders.reduce((sum, order) => sum + order.order_value, 0);
        setLifetimeValue(total);
        const teamRows = await fetchCustomerTeam();
        setTeam(teamRows);
      } catch (e) {
        setError(parseRpcError(e).message);
      }
    })();
  }, []);

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Dashboard" subtitle="Lifetime value · Team access" scroll={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Lifetime Value</Text>
            <Text style={styles.statValue}>₹{(lifetimeValue ?? 0).toLocaleString("en-IN")}</Text>
          </View>
        </View>

        <View style={styles.teamHeader}>
          <Text style={styles.sectionTitle}>Team Access</Text>
        </View>

        <FlatList
          data={team}
          keyExtractor={(item) => item.profile_id}
          ListEmptyComponent={<Text style={styles.empty}>No team members visible for your company</Text>}
          renderItem={({ item }) => (
            <View style={styles.teamRow}>
              <Text style={styles.teamName}>{item.full_name ?? item.email ?? "Team member"}</Text>
              <Text style={styles.teamRole}>{item.role}</Text>
            </View>
          )}
        />
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: "#F0DED0", borderRadius: 12, padding: 16 },
  statLabel: { fontSize: 11, color: "#5A4438" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#7A1B2B", marginTop: 6 },
  teamHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#3A2A22" },
  teamRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0DED0" },
  teamName: { fontSize: 13, color: "#3A2A22" },
  teamRole: { fontSize: 12, color: "#8A6B5C" },
  empty: { fontSize: 13, color: "#8A6B5C", paddingVertical: 12 },
  error: { color: "#B3261E", marginBottom: 8 },
});
