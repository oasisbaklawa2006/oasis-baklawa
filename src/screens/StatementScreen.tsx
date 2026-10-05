import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { formatInr } from "@/lib/customer-projections";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerStatement } from "@/types/database.types";
import { colors, spacing, typography, touchTarget } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Statement">;

/** Presents the authoritative buyer statement facts as a dedicated customer-safe surface. */
export function StatementScreen({ navigation }: Props) {
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setStatement(await customerGateway.statement());
    } catch (e) {
      setError(parseRpcError(e).message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Statement" subtitle="Your issued invoices and amounts due">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.back}>‹ Back to documents</Text>
        </TouchableOpacity>
        {loading ? <LoadingState message="Loading statement…" /> : error ? <ErrorState message={error} onRetry={load} /> :
          !statement?.statement_facts_only ? (
            <EmptyState title="Statement not available yet" message="Your account statement will appear here when issued information is available." />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll}>
              {statement.wallet_balance !== null ? (
                <View style={styles.summary}>
                  <Text style={styles.label}>Wallet balance</Text>
                  <Text style={styles.value}>{formatInr(statement.wallet_balance)}</Text>
                </View>
              ) : null}
              {statement.entries.length === 0 ? (
                <EmptyState title="No statement entries yet" message="Issued invoices will appear here as your account activity develops." />
              ) : statement.entries.map((entry, index) => (
                <View key={`${entry.order_id || "entry"}-${index}`} style={styles.card}>
                  <View style={styles.row}>
                    <Text style={styles.invoice}>{entry.invoice_number || "Issued invoice"}</Text>
                    <Text style={styles.amount}>{formatInr(entry.invoice_gross_total)}</Text>
                  </View>
                  {entry.invoice_date ? <Text style={styles.meta}>Issued {entry.invoice_date}</Text> : null}
                  {entry.pre_dispatch_net_due !== null ? <Text style={styles.meta}>Amount due before dispatch: {formatInr(entry.pre_dispatch_net_due)}</Text> : null}
                </View>
              ))}
            </ScrollView>
          )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  backButton: { minHeight: touchTarget, justifyContent: "center" },
  back: { fontFamily: typography.fontFamilySansMedium, color: colors.action },
  scroll: { paddingBottom: spacing.xl, gap: spacing.sm },
  summary: { backgroundColor: colors.surfacePremium, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.sm },
  label: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  value: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXl, color: colors.textPrimary, marginTop: 4 },
  card: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12, padding: spacing.md, backgroundColor: colors.surfacePremium },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  invoice: { flex: 1, fontFamily: typography.fontFamilySansMedium, fontSize: typography.sizeSm, color: colors.textPrimary },
  amount: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  meta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 6 },
});
