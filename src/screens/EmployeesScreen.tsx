import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { BuyerServiceRequestPanel } from "@/components/BuyerServiceRequestPanel";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCustomerTeam } from "@/lib/api/buyer";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerTeamMember } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Employees">;

export function EmployeesScreen({ navigation }: Props) {
  const [rows, setRows] = useState<CustomerTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchCustomerTeam());
    } catch (e) {
      setRows([]);
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <BuyerGate
      requireApprovedBuyer
      onLogin={() => navigation.navigate("Login")}
      onRegister={() => navigation.navigate("Register")}
    >
      <Screen
        title="Employees"
        subtitle="People with access to your Oasis trade account"
        scroll={false}
      >
        <FlatList
          data={loading || error ? [] : rows}
          keyExtractor={(item) => item.profile_id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={error} onRetry={load} />
            ) : null
          }
          ListEmptyComponent={
            !loading && !error ? (
              <EmptyState
                title="No employees yet"
                message="Approved team members will appear here when access is created."
              />
            ) : null
          }
          ListFooterComponent={
            <BuyerServiceRequestPanel
              category="ACCOUNT"
              subject="Team access self-service request"
              intro="Use this governed request to add a colleague, remove access, correct contact details or request a role change. Include the employee name, work email, mobile number, requested action and required access role. Oasis will verify authority before changing access."
              placeholder="Action: add / remove / update / role change. Employee name, work email, mobile number, requested role and any effective date…"
              submitLabel="Submit team access request"
              historyTitle="Team access requests"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>
                {item.full_name ?? item.email ?? item.mobile_number ?? "Team member"}
              </Text>
              <Text style={styles.meta}>
                {item.role.replace(/_/g, " ")} · {item.status.replace(/_/g, " ")}
              </Text>
              {item.email ? <Text style={styles.meta}>{item.email}</Text> : null}
              {item.mobile_number ? <Text style={styles.meta}>{item.mobile_number}</Text> : null}
            </View>
          )}
        />
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.md, gap: spacing.sm },
  card: {
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surfacePremium,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  name: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeMd,
    color: colors.textPrimary,
  },
  meta: {
    marginTop: 4,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
  },
});
