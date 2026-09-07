import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  customerQuotationStatusLabel,
  quotationExpiryLabel,
} from "@/lib/quote-projections";
import { formatInr } from "@/lib/customer-projections";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerQuotationSummary } from "@/types/quote-contract";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Quotations">;

export function QuotationsScreen({ navigation }: Props) {
  const [quotations, setQuotations] = useState<CustomerQuotationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuotations(await customerGateway.quotations());
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <BuyerGate>
      <Screen title="Quotations" subtitle="Governed quotation history for your company">
        {loading ? (
          <LoadingState message="Loading quotations…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : quotations.length === 0 ? (
          <EmptyState
            title="No quotations yet"
            message="Request a quotation from a product page. Prices and totals always come from Core."
            actionLabel="Browse catalogue"
            onAction={() => navigation.navigate("MainTabs", { screen: "Catalogue" })}
          />
        ) : (
          <FlatList
            data={quotations}
            keyExtractor={(item) => item.quotation_id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  navigation.navigate("QuotationDetail", {
                    quotationId: item.quotation_id,
                    quotationNumber: item.quotation_number,
                  })
                }
                accessibilityRole="button"
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.quotation_number}</Text>
                  <Text style={styles.status}>{customerQuotationStatusLabel(item.status)}</Text>
                </View>
                <Text style={styles.value}>{formatInr(item.quotation_value)}</Text>
                <Text style={styles.meta}>
                  Version {item.current_version} · {quotationExpiryLabel(item.expires_at)}
                </Text>
                {item.is_actionable ? <Text style={styles.actionable}>Ready for review</Text> : null}
              </TouchableOpacity>
            )}
          />
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surfacePremium,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  cardTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  status: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, textTransform: "capitalize" },
  value: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeLg, color: colors.action },
  meta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  actionable: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.action },
});
