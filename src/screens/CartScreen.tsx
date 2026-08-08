import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
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

type Props = NativeStackScreenProps<RootStackParamList, "Cart">;

export function CartScreen({ navigation }: Props) {
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
      <Screen title="Cart" subtitle="Server draft · MOQ · Carton readiness">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color="#7A1B2B" style={styles.loader} />
        ) : !draft || draft.lines.length === 0 ? (
          <Text style={styles.empty}>Your cart is empty. Add products from the catalogue.</Text>
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
                              disabled={busy}
                              onPress={() => changeQuantity(item.line_id, item.product_id, -1, item.quantity)}
                            >
                              <Text style={styles.actionText}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              disabled={busy}
                              onPress={() => changeQuantity(item.line_id, item.product_id, 1, item.quantity)}
                            >
                              <Text style={styles.actionText}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={busy} onPress={() => removeLine(item.line_id)}>
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

            <TouchableOpacity style={styles.secondaryButton} disabled={busyLineId === "clear"} onPress={clearCart}>
              <Text style={styles.secondaryButtonText}>{busyLineId === "clear" ? "Clearing…" : "Clear cart"}</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.button, !checkoutReady && styles.buttonDisabled]}
          disabled={!checkoutReady}
          onPress={() => navigation.navigate("Checkout")}
        >
          <Text style={styles.buttonText}>
            {checkoutReady ? "Proceed to Checkout" : "Complete carton/MOQ rules to checkout"}
          </Text>
        </TouchableOpacity>
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  groupSection: { marginTop: 16 },
  groupTitle: { fontSize: 14, fontWeight: "700", color: "#7A1B2B", marginBottom: 8 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0DED0" },
  lineInfo: { flex: 1 },
  lineTitle: { fontSize: 13, fontWeight: "600", color: "#3A2A22" },
  lineMeta: { fontSize: 11, color: "#8A6B5C", marginTop: 2 },
  warningText: { fontSize: 11, color: "#B26A00", marginTop: 4 },
  lineActions: { flexDirection: "row", gap: 16, marginTop: 6 },
  actionText: { fontSize: 16, color: "#7A1B2B", fontWeight: "700" },
  removeText: { fontSize: 11, color: "#B3261E", fontWeight: "600" },
  hintText: { fontSize: 10, color: "#8A6B5C", marginTop: 4 },
  lineTotal: { fontSize: 13, fontWeight: "700", color: "#3A2A22" },
  summary: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E0C9B8" },
  summaryLabel: { fontSize: 15, fontWeight: "700", color: "#3A2A22" },
  summaryValue: { fontSize: 17, fontWeight: "800", color: "#7A1B2B" },
  button: { backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 20 },
  buttonDisabled: { backgroundColor: "#B0A296" },
  buttonText: { color: "#FFF", fontWeight: "700", textAlign: "center" },
  secondaryButton: { marginTop: 12, alignItems: "center" },
  secondaryButtonText: { color: "#7A1B2B", fontWeight: "600", fontSize: 13 },
  empty: { fontSize: 13, color: "#8A6B5C", paddingVertical: 20, textAlign: "center" },
  error: { color: "#B3261E", marginTop: 8 },
  loader: { marginTop: 24 },
});
