import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { BuyerServiceRequestPanel } from "@/components/BuyerServiceRequestPanel";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/StateViews";
import { fetchCustomerPackagingOffers } from "@/lib/api/account-preferences";
import { formatInr } from "@/lib/customer-projections";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerPackagingOffer } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "PackagingDecoration">;

export function PackagingDecorationScreen({ navigation }: Props) {
  const [rows, setRows] = useState<CustomerPackagingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchCustomerPackagingOffers());
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
      <Screen title="Packaging & Decoration" subtitle="Published packaging and presentation materials">
        {loading ? (
          <LoadingState message="Loading packaging offers…" />
        ) : error ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Published packaging offers could not be loaded.</Text>
            <Text style={styles.warningText}>{error}</Text>
            <Text style={styles.warningText}>
              You can still submit the exact product, quantity, box/tray format, branding or decoration and target delivery date below. The request stays pending until governed compatibility and commercial terms are confirmed.
            </Text>
            <OasisButton label="Retry published offers" variant="secondary" onPress={load} />
          </View>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>
            No packaging or decoration SKUs are currently published with Buyer-safe commercial terms. Submit the requirement below for governed review.
          </Text>
        ) : (
          rows.map((row) => (
            <View key={row.product_id} style={styles.card}>
              <Text style={styles.name}>{row.product_name}</Text>
              <Text style={styles.sku}>{row.sku}</Text>
              {row.short_description ? (
                <Text style={styles.description}>{row.short_description}</Text>
              ) : null}
              <Fact
                label="Price"
                value={
                  row.selling_price == null
                    ? "Commercial review required"
                    : formatInr(row.selling_price)
                }
              />
              <Fact
                label="MOQ"
                value={
                  row.minimum_order_quantity == null
                    ? "To be confirmed"
                    : `${row.minimum_order_quantity} ${row.minimum_order_uom ?? row.primary_uom ?? ""}`.trim()
                }
              />
              <Fact
                label="Order increment"
                value={
                  row.order_increment == null
                    ? "—"
                    : `${row.order_increment} ${row.order_increment_uom ?? row.primary_uom ?? ""}`.trim()
                }
              />
              <Fact
                label="Lead time"
                value={row.lead_time_days == null ? "To be confirmed" : `${row.lead_time_days} days`}
              />
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
          subject="Packaging and decoration enquiry"
          intro="Provide the product/SKU, quantity, required box/tray format, branding or decoration, and target delivery date. Oasis will validate compatibility, MOQ, price and lead time before any commitment."
          placeholder="Product/SKU, quantity, box/tray format, branding/decoration and target delivery date…"
          submitLabel="Request packaging options"
          historyTitle="Packaging requests"
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
  description: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
    lineHeight: 20,
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
});
