import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { ProductImage } from "@/components/ProductImage";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/StateViews";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { fetchCatalogue, type CatalogueProduct } from "@/lib/api/catalogue";
import { addCustomerOrderDraftLine } from "@/lib/api/draft";
import { nextValidQuantity } from "@/lib/draft-utils";
import { parseRpcError } from "@/lib/rpc-errors";
import { colors, spacing, typography } from "@/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Catalogue">,
  NativeStackScreenProps<RootStackParamList>
>;

export function CatalogueScreen({ navigation }: Props) {
  const { isApprovedBuyer } = useBuyerSession();
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCatalogue({ includeBuyerPrices: isApprovedBuyer });
      setProducts(rows);
      const initialQuantities: Record<string, number> = {};
      rows.forEach((product) => {
        const moq = product.price?.minimum_order_quantity ?? 1;
        initialQuantities[product.product_id] = moq;
      });
      setQuantities(initialQuantities);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, [isApprovedBuyer]);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)));
    return ["All", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    let rows = !activeCategory || activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.product_name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category?.toLowerCase().includes(q) ?? false) ||
          (p.subcategory?.toLowerCase().includes(q) ?? false)
      );
    }
    return rows;
  }, [products, activeCategory, searchQuery]);

  function stepQuantity(productId: string, moq: number, increment: number, delta: number) {
    setQuantities((prev) => {
      const current = prev[productId] ?? moq;
      const next = nextValidQuantity(current, moq, increment, delta);
      return { ...prev, [productId]: next };
    });
  }

  async function addToCart(product: CatalogueProduct) {
    const moq = product.price?.minimum_order_quantity ?? 1;
    const qty = quantities[product.product_id] ?? moq;

    setBusyProductId(product.product_id);
    setError(null);
    setSuccessMessage(null);
    try {
      await addCustomerOrderDraftLine(product.product_id, qty);
      setSuccessMessage(`${product.product_name} added to cart`);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setBusyProductId(null);
    }
  }

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")} requireApprovedBuyer={false}>
      <Screen title="Catalogue" subtitle="Categories · Tiered pricing · MOQ" scroll={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
        <TextInput
          style={styles.search}
          placeholder="Search products, SKU, category…"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search catalogue"
        />
        {loading ? (
          <LoadingState message="Loading catalogue…" />
        ) : (
          <>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryRow}
              data={categories}
              keyExtractor={(c) => c}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.categoryChip, (activeCategory ?? "All") === item && styles.categoryChipActive]}
                  onPress={() => setActiveCategory(item)}
                >
                  <Text style={[styles.categoryText, (activeCategory ?? "All") === item && styles.categoryTextActive]}>{item}</Text>
                </TouchableOpacity>
              )}
            />

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.product_id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const moq = item.price?.minimum_order_quantity ?? 1;
                const increment = item.price?.order_increment ?? 1;
                const qty = quantities[item.product_id] ?? moq;
                const adding = busyProductId === item.product_id;
                return (
                  <View style={styles.row}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("ProductDetail", { productId: item.product_id })}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${item.product_name}`}
                    >
                      <ProductImage uri={item.hero_image_url} style={styles.rowImage} />
                    </TouchableOpacity>
                    <View style={styles.rowInfo}>
                      <TouchableOpacity onPress={() => navigation.navigate("ProductDetail", { productId: item.product_id })}>
                        <Text style={styles.rowTitle}>{item.product_name}</Text>
                      </TouchableOpacity>
                      <Text style={styles.rowMeta}>{item.subcategory ?? item.category}</Text>
                      {isApprovedBuyer && item.price ? (
                        <View style={styles.priceBadge}>
                          <Text style={styles.priceBadgeText}>
                            ₹{item.price.selling_price.toFixed(2)} / {item.price.uom}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.rowMeta}>Sign in as an approved buyer for pricing</Text>
                      )}
                      {isApprovedBuyer ? (
                        <>
                          <View style={styles.stepper}>
                        <TouchableOpacity
                          style={styles.stepperButton}
                          onPress={() => stepQuantity(item.product_id, moq, increment, -1)}
                        >
                          <Text style={styles.stepperButtonText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.stepperButton}
                          onPress={() => stepQuantity(item.product_id, moq, increment, 1)}
                        >
                          <Text style={styles.stepperButtonText}>+</Text>
                        </TouchableOpacity>
                        <Text style={styles.moqNote}>MOQ {moq}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addButton}
                        disabled={adding || !item.price}
                        onPress={() => addToCart(item)}
                      >
                        <Text style={styles.addButtonText}>{adding ? "Adding…" : "Add to cart"}</Text>
                      </TouchableOpacity>
                        </>
                      ) : null}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>No products available</Text>}
            />
          </>
        )}

        {isApprovedBuyer ? (
          <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("Cart")} accessibilityRole="button">
            <Text style={styles.fabText}>View Cart</Text>
          </TouchableOpacity>
        ) : null}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  categoryRow: { marginTop: 12, marginBottom: 4, flexGrow: 0 },
  search: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfacePremium, marginRight: 8 },
  categoryChipActive: { backgroundColor: colors.action },
  categoryText: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXs, color: colors.action },
  categoryTextActive: { color: colors.white },
  list: { paddingVertical: 12, gap: 14 },
  row: { flexDirection: "row", gap: 12 },
  rowImage: { width: 72, height: 72, borderRadius: 10 },
  rowInfo: { flex: 1 },
  rowTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  rowMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 2 },
  priceBadge: { alignSelf: "flex-start", backgroundColor: colors.successSurface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  priceBadgeText: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXs, color: colors.success },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  stepperButton: { width: 44, height: 44, borderRadius: 6, backgroundColor: colors.surfacePremium, alignItems: "center", justifyContent: "center" },
  stepperButtonText: { fontSize: 16, color: colors.action, fontWeight: "700" },
  stepperValue: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, minWidth: 30, textAlign: "center" },
  moqNote: { fontFamily: typography.fontFamilySans, fontSize: 10, color: colors.textMuted, marginLeft: 6 },
  addButton: { marginTop: 8, backgroundColor: colors.action, paddingVertical: 8, borderRadius: 8, alignItems: "center", minHeight: 44, justifyContent: "center" },
  addButtonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white, fontSize: typography.sizeSm },
  empty: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted, paddingVertical: 20, textAlign: "center" },
  fab: { position: "absolute", bottom: 16, right: 0, left: 0, marginHorizontal: 20, backgroundColor: colors.textPrimary, paddingVertical: 14, borderRadius: 10, alignItems: "center", minHeight: 44, justifyContent: "center" },
  fabText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  error: { color: colors.error, marginTop: 8, fontSize: typography.sizeSm },
  success: { color: colors.success, marginTop: 8, fontSize: typography.sizeSm, fontFamily: typography.fontFamilySansSemiBold },
});
