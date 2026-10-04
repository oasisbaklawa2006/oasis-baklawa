import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useNetwork } from "@/context/NetworkContext";
import { calculateCustomerAdvance } from "@/lib/api/checkout";
import { getCustomerOrderDraft } from "@/lib/api/draft";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerOrderDraft } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "CommercialReview">;

/** Buyer-facing commercial checkpoint before governed checkout. */
export function CommercialReviewScreen({ navigation }: Props) {
  const { isOnline } = useNetwork();
  const [draft, setDraft] = useState<CustomerOrderDraft | null>(null);
  const [advance, setAdvance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = await getCustomerOrderDraft();
      setDraft(current);
      if (current?.draft_id && current.lines.length > 0) {
        setAdvance(await calculateCustomerAdvance(current.order_total));
      } else {
        setAdvance(null);
      }
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Review your order" subtitle="Check the commercial details before confirming">
        {loading ? <LoadingState message="Preparing your order review…" /> : null}
        {error && !loading ? <ErrorState message={error} onRetry={load} /> : null}
        {!loading && !error && (!draft || draft.lines.length === 0) ? (
          <EmptyState
            title="Your cart is empty"
            message="Add products before reviewing your order."
            actionLabel="Browse catalogue"
            onAction={() => navigation.navigate("MainTabs", { screen: "Catalogue" })}
          />
        ) : null}
        {!loading && !error && draft?.lines.length ? (
          <>
            <View style={styles.card}>
              {draft.lines.map((line) => (
                <View key={line.line_id} style={styles.line}>
                  <View style={styles.lineCopy}>
                    <Text style={styles.product}>{line.product_name_snapshot ?? line.sku_snapshot ?? "Product"}</Text>
                    <Text style={styles.meta}>
                      {line.quantity} {line.uom_snapshot ?? "units"} × ₹{line.unit_price_snapshot.toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <Text style={styles.amount}>₹{line.line_total.toLocaleString("en-IN")}</Text>
                </View>
              ))}
            </View>
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order total</Text>
                <Text style={styles.total}>₹{draft.order_total.toLocaleString("en-IN")}</Text>
              </View>
              {advance !== null ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Advance required</Text>
                  <Text style={styles.advance}>₹{advance.toLocaleString("en-IN")}</Text>
                </View>
              ) : null}
              <Text style={styles.note}>Taxes and final invoice details will follow the issued commercial documents.</Text>
            </View>
            <OasisButton
              label="Continue to checkout"
              onPress={() => navigation.navigate("Checkout")}
              disabled={!draft.is_checkout_ready || !isOnline || advance === null}
              accessibilityHint="Continues to final order confirmation"
            />
          </>
        ) : null}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, backgroundColor: colors.surfacePremium, borderRadius: 16, padding: spacing.md },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  lineCopy: { flex: 1 },
  product: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  meta: { marginTop: 4, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  amount: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  summary: { marginVertical: spacing.lg, gap: spacing.sm },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, color: colors.textSecondary },
  total: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeXl, color: colors.textPrimary },
  advance: { fontFamily: typography.fontFamilySansBold, fontSize: typography.sizeLg, color: colors.action },
  note: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, lineHeight: 18 },
});
