import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { EmptyState, LoadingState } from "@/components/StateViews";
import { useNetwork } from "@/context/NetworkContext";
import { fetchBuyerProductPrices } from "@/lib/api/catalogue";
import {
  clearCustomerOrderDraft,
  getCustomerOrderDraft,
  removeCustomerOrderDraftLine,
  updateCustomerOrderDraftLine,
} from "@/lib/api/draft";
import { issueMessage, nextValidQuantity } from "@/lib/draft-utils";
import { parseRpcError } from "@/lib/rpc-errors";
import type { BuyerProductPrice, CustomerOrderDraft, CustomerOrderDraftLine } from "@/types/database.types";
import { colors, spacing, typography, touchTarget } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Cart">;

export function CartScreen({ navigation }: Props) {
  const { isOnline } = useNetwork();
  const [draft, setDraft] = useState<CustomerOrderDraft | null>(null);
  const [pricesByProduct, setPricesByProduct] = useState<Record<string, BuyerProductPrice>>({});
  const [loading, setLoading] = useState(true);
  const [busyLineId, setBusyLineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [draftData, prices] = await Promise.all([getCustomerOrderDraft(), fetchBuyerProductPrices()]);
      setDraft(draftData);
      setPricesByProduct(Object.fromEntries(prices.map((price) => [price.product_id, price])));
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const grouped = useMemo(() => {
    const groups: Record<string, CustomerOrderDraftLine[]> = {};
    if (!draft) return groups;
    draft.lines.forEach((line) => {
      const category = pricesByProduct[line.product_id]?.minimum_order_uom ?? "Items";
      if (!groups[category]) groups[category] = [];
      groups[category].push(line);
    });
    return groups;
  }, [draft, pricesByProduct]);

  async function changeQuantity(lineId: string, productId: string, delta: number, currentQty: number) {
    const price = pricesByProduct[productId];
    const moq = price?.minimum_order_quantity ?? 1;
    const increment = price?.order_increment ?? 1;
    const nextQty = nextValidQuantity(currentQty, moq, increment, delta);

    setBusyLineId(lineId);
    setError(null);
    try {
      const updated = await updateCustomerOrderDraftLine(lineId, nextQty);
      setDraft(updated);
    } catch (e) {
      setError(parseRpcError(e).message);
      await loadDraft();
    } finally {
      setBusyLineId(null);
    }
  }

  async function removeLine(lineId: string) {
    setBusyLineId(lineId);
    setError(null);
    try {
      const updated = await removeCustomerOrderDraftLine(lineId);
      setDraft(updated);
    } catch (e) {
      await loadDraft();
      setError(parseRpcError(e).message);
    } finally {
      setBusyLineId(null);
    }
  }

  async function clearCart() {
    setBusyLineId("clear");
    setError(null);
    try {
      const updated = await clearCustomerOrderDraft();
      setDraft(updated);
    } catch (e) {
      await loadDraft();
      setError(parseRpcError(e).message);
    } finally {
      setBusyLineId(null);
    }
  }

  const checkoutReady = draft?.is_checkout_ready ?? false;

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Cart" subtitle="Server draft · MOQ · Carton readiness" safeAreaEdges={["top", "bottom"]}>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        {loading ? (
          <LoadingState message="Loading cart…" />
        ) : !draft || draft.lines.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            message="Add products from the catalogue to build a server-backed draft."
            actionLabel="Browse catalogue"
            onAction={() => navigation.navigate("MainTabs", { screen: "Catalogue" })}
          />
        ) : (
          <>
            {Object.entries(grouped).map(([group, lines]) => (
              <View key={group} style={styles.groupSection}>
                <Text style={styles.groupTitle}>{group}</Text>
                <FlatList
                  data={lines}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.line_id}
                  renderItem={({ item }) => {
                    const price = pricesByProduct[item.product_id];
                    const moq = price?.minimum_order_quantity ?? 1;
                    const increment = price?.order_increment ?? 1;
                    const lineIssues = draft.readiness_issues.filter((issue) => issue.product_id === item.product_id);
                    const busy = busyLineId === item.line_id;
                    return (
                      <View style={styles.line}>
                        <View style={styles.lineInfo}>
                          <Text style={styles.lineTitle}>{item.product_name_snapshot ?? item.sku_snapshot ?? "Product"}</Text>
                          <Text style={styles.lineMeta}>
                            Qty {item.quantity} · ₹{item.unit_price_snapshot}/{item.uom_snapshot ?? "unit"}
                          </Text>
                          {lineIssues.map((issue, index) => (
                            <Text key={`${issue.code}-${index}`} style={styles.warningText}>
                              {issueMessage(issue, price)}
                            </Text>
                          ))}
                          <View style={styles.lineActions}>
                            <TouchableOpacity
                              disabled={busy || !isOnline}
                              onPress={() => changeQuantity(item.line_id, item.product_id, -1, item.quantity)}
                              accessibilityRole="button"
                              accessibilityLabel="Decrease quantity"
                            >
                              <Text style={styles.actionText}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              disabled={busy || !isOnline}
                              onPress={() => changeQuantity(item.line_id, item.product_id, 1, item.quantity)}
                              accessibilityRole="button"
                              accessibilityLabel="Increase quantity"
                            >
                              <Text style={styles.actionText}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              disabled={busy || !isOnline}
                              onPress={() => removeLine(item.line_id)}
                              accessibilityRole="button"
                              accessibilityLabel="Remove line"
                            >
                              <Text style={styles.removeText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.hintText}>MOQ {moq} · step {increment}</Text>
                        </View>
                        <Text style={styles.lineTotal}>₹{item.line_total.toLocaleString("en-IN")}</Text>
                      </View>
                    );
                  }}
                />
              </View>
            ))}

            {draft.readiness_issues
              .filter((issue) => !issue.product_id)
              .map((issue, index) => (
                <Text key={`global-${issue.code}-${index}`} style={styles.warningText}>
                  {issueMessage(issue)}
                </Text>
              ))}

            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Order Total (server draft)</Text>
              <Text style={styles.summaryValue}>₹{draft.order_total.toLocaleString("en-IN")}</Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              disabled={busyLineId === "clear" || !isOnline}
              onPress={clearCart}
              accessibilityRole="button"
              accessibilityLabel="Clear cart"
            >
              <Text style={styles.secondaryButtonText}>{busyLineId === "clear" ? "Clearing…" : "Clear cart"}</Text>
            </TouchableOpacity>
          </>
        )}

        <OasisButton
          label={checkoutReady ? "Proceed to Checkout" : "Complete carton/MOQ rules to checkout"}
          onPress={() => navigation.navigate("Checkout")}
          disabled={!checkoutReady || !isOnline}
          accessibilityHint="Opens governed checkout with advance calculation"
        />
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  groupSection: { marginTop: spacing.md },
  groupTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.action, marginBottom: spacing.sm },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  lineInfo: { flex: 1 },
  lineTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  lineMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 2 },
  warningText: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.warning, marginTop: 4 },
  lineActions: { flexDirection: "row", gap: spacing.md, marginTop: 6 },
  actionText: { fontSize: 16, color: colors.action, fontWeight: "700", minWidth: touchTarget, textAlign: "center" },
  removeText: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXs, color: colors.error },
  hintText: { fontFamily: typography.fontFamilySans, fontSize: 10, color: colors.textMuted, marginTop: 4 },
  lineTotal: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryLabel: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  summaryValue: { fontFamily: typography.fontFamilySansBold, fontSize: typography.sizeLg, color: colors.action },
  secondaryButton: { marginTop: spacing.md, alignItems: "center", minHeight: touchTarget, justifyContent: "center" },
  secondaryButtonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.action, fontSize: typography.sizeSm },
  error: { color: colors.error, marginTop: spacing.sm, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm },
});
