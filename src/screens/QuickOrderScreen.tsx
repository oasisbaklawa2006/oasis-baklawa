import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCatalogue, type CatalogueProduct } from "@/lib/api/catalogue";
import { addCustomerOrderDraftLine } from "@/lib/api/draft";
import { parseRpcError } from "@/lib/rpc-errors";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "QuickOrder">;
type QuickRow = { product: CatalogueProduct };

export function QuickOrderScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<QuickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalogue = await fetchCatalogue();
      setRows(catalogue.filter((p) => p.price).map((product) => ({ product })));
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      ({ product }) =>
        product.product_name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q)
    );
  }, [rows, query]);

  async function quickAdd(product: CatalogueProduct) {
    const moq = product.price?.minimum_order_quantity ?? 1;
    setBusyId(product.product_id);
    try {
      await addCustomerOrderDraftLine(product.product_id, moq);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Quick Order" subtitle="Repeat regular SKUs at MOQ" scroll={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.search}
          placeholder="Search SKU or product name"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search quick order products"
        />
        {loading ? (
          <LoadingState message="Loading approved products…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.product.product_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState title="No priced products" message="Approved buyer pricing is required for Quick Order." />}
            renderItem={({ item }) => {
              const { product } = item;
              const moq = product.price?.minimum_order_quantity ?? 1;
              const busy = busyId === product.product_id;
              return (
                <View style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.title}>{product.product_name}</Text>
                    <Text style={styles.meta}>
                      {product.sku} · MOQ {moq} · ₹{product.price?.selling_price.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addBtn}
                    disabled={busy}
                    onPress={() => quickAdd(product)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.addBtnText}>{busy ? "…" : `+${moq}`}</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  back: { fontFamily: typography.fontFamilySansMedium, color: colors.action, marginTop: spacing.sm },
  search: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: typography.fontFamilySans,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  list: { paddingVertical: spacing.md, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfacePremium, borderRadius: 10, padding: spacing.md },
  rowInfo: { flex: 1 },
  title: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  meta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 4 },
  addBtn: { backgroundColor: colors.action, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 44, alignItems: "center" },
  addBtnText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
});
