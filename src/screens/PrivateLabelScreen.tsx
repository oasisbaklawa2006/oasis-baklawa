import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { BuyerServiceRequestPanel } from "@/components/BuyerServiceRequestPanel";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/StateViews";
import { fetchCustomerPrivateLabelProducts } from "@/lib/api/account-preferences";
import { formatInr } from "@/lib/customer-projections";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerPrivateLabelProduct } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "PrivateLabel">;

export function PrivateLabelScreen({ navigation }: Props) {
  const [rows, setRows] = useState<CustomerPrivateLabelProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchCustomerPrivateLabelProducts());
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
      <Screen title="Private Label" subtitle="Published products eligible for custom branding">
        {loading ? (
          <LoadingState message="Loading private-label offers…" />
        ) : error ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Published private-label offers could not be loaded.</Text>
            <Text style={styles.warningText}>{error}</Text>
            <Text style={styles.warningText}>
              You can still submit the exact product, quantity, branding, pack-format and delivery requirement below. The request is auditable and does not invent commercial terms.
            </Text>
            <OasisButton label="Retry published offers" variant="secondary" onPress={load} />
          </View>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>
            No private-label products are currently published for Buyer ordering. Submit the requirement below for governed review.
          </Text>
        ) : (
          rows.map((row) => (
            <View key={row.product_id} style={styles.card}>
              <Text style={styles.name}>{row.product_name}</Text>
              <Text style={styles.sku}>{row.sku}</Text>
              <Fact
                label="MOQ"
                value={
                  row.private_label_moq == null
                    ? "Contact Oasis"
                    : `${row.private_label_moq} ${row.private_label_moq_uom ?? ""}`.trim()
                }
              />
              <Fact
                label="Price"
                value={
                  row.private_label_price == null
                    ? "Commercial review required"
                    : formatInr(row.private_label_price)
                }
              />
              <Fact
                label="Lead time"
                value={row.lead_time_days == null ? "To be confirmed" : `${row.lead_time_days} days`}
              />
              {row.customization_note ? <Text style={styles.note}>{row.customization_note}</Text> : null}
              {row.customization_caution ? (
                <Text style={styles.caution}>{row.customization_caution}</Text>
              ) : null}
              <OasisButton
                label="View published product"
                variant="secondary"
                onPress={() => navigation.navigate("ProductDetail", { productId: row.product_id })}
              />
            </View>
          ))
        )}

        <BuyerServiceRequestPanel
          category="CATALOGUE"
          subject="Private label enquiry"
          intro="Provide the product/SKU, expected quantity, branding or artwork requirement, pack format and target delivery date. Oasis will validate eligibility, MOQ, price and lead time before any commitment."
          placeholder="Product/SKU, quantity, branding/artwork, pack format and target delivery date…"
          submitLabel="Request private-label review"
          historyTitle="Private-label requests"
        />
      </Screen>
    </BuyerGate>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    marginTop: spacing.lg,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  warningCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.surfacePremium,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  warningTitle: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeMd,
    color: colors.textPrimary,
  },
  warningText: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  name: {
    fontFamily: typography.fontFamilySerifBold,
    fontSize: typography.sizeLg,
    color: colors.textPrimary,
  },
  sku: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  factRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  factLabel: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textMuted,
  },
  factValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeSm,
    color: colors.textPrimary,
  },
  note: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  caution: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeXs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
