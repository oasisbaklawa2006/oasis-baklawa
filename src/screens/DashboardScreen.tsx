import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { supabase } from "@/lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

interface TeamMember {
  id: string;
  name: string;
  role: "Owner" | "Buyer" | "Accounts" | "Viewer";
}

export function DashboardScreen({}: Props) {
  const [lifetimeValue, setLifetimeValue] = useState<number | null>(null);
  const [creditPool, setCreditPool] = useState<number | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("customer_order_status_v1");
      const total = (data ?? []).reduce((sum, o) => sum + o.order_value, 0);
      setLifetimeValue(total);
      setCreditPool(0);
      setTeam([]);
    })();
  }, []);

  return (
    <Screen title="Dashboard" subtitle="Lifetime value · Credit pool · Team access" scroll={false}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Lifetime Value</Text>
          <Text style={styles.statValue}>₹{(lifetimeValue ?? 0).toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Credit Pool Balance</Text>
          <Text style={styles.statValue}>₹{(creditPool ?? 0).toLocaleString("en-IN")}</Text>
        </View>
      </View>

      <View style={styles.teamHeader}>
        <Text style={styles.sectionTitle}>Team Access</Text>
        <TouchableOpacity>
          <Text style={styles.inviteLink}>+ Invite</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={team}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No team members added yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{item.name}</Text>
            <Text style={styles.teamRole}>{item.role}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: "#F0DED0", borderRadius: 12, padding: 16 },
  statLabel: { fontSize: 11, color: "#5A4438" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#7A1B2B", marginTop: 6 },
  teamHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#3A2A22" },
  inviteLink: { fontSize: 12, color: "#7A1B2B", fontWeight: "700" },
  teamRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0DED0" },
  teamName: { fontSize: 13, color: "#3A2A22" },
  teamRole: { fontSize: 12, color: "#8A6B5C" },
  empty: { fontSize: 13, color: "#8A6B5C", paddingVertical: 12 },
});
