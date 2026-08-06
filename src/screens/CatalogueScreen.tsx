import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { supabase } from "@/lib/supabase";
import type { BuyerProductPrice, PublishedProduct } from "@/types/database.types";

type Props = NativeStackScreenProps<RootStackParamList, "Catalogue">;

interface CatalogueRow extends PublishedProduct {
  price?: BuyerProductPrice;
}

export function CatalogueScreen({ navigation }: Props) {
  const [products, setProducts] = useState<CatalogueRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const [{ data: productData }, { data: priceData }] = await Promise.all([
        supabase.rpc("published_products_v1"),
        supabase.rpc("buyer_product_prices_v1"),
      ]);
      const priceByProduct = new Map((priceData ?? []).map((p) => [p.product_id, p]));
      setProducts((productData ?? []).map((p) => ({ ...p, price: priceByProduct.get(p.product_id) })));
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)));
    return ["All", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(
    () => (!activeCategory || activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory)),
    [products, activeCategory]
  );

  function stepQuantity(productId: string, moq: number, increment: number, delta: number) {
    setQuantities((prev) => {
      const current = prev[productId] ?? moq;
      const next = Math.max(moq, current + delta * increment);
      return { ...prev, [productId]: next };
    });
  }

  return (
    <Screen title="Catalogue" subtitle="Categories · Tiered pricing · MOQ" scroll={false}>
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
          return (
            <View style={styles.row}>
              <Image source={item.hero_image_url ? { uri: item.hero_image_url } : undefined} style={styles.rowImage} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{item.product_name}</Text>
                <Text style={styles.rowMeta}>{item.subcategory ?? item.category}</Text>
                {item.price ? (
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>
                      ₹{item.price.selling_price.toFixed(2)} / {item.price.uom}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.rowMeta}>Sign in for buyer pricing</Text>
                )}
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepperButton} onPress={() => stepQuantity(item.product_id, moq, increment, -1)}>
                    <Text style={styles.stepperButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{qty}</Text>
                  <TouchableOpacity style={styles.stepperButton} onPress={() => stepQuantity(item.product_id, moq, increment, 1)}>
                    <Text style={styles.stepperButtonText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.moqNote}>MOQ {moq}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Loading catalogue…</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("Cart")}>
        <Text style={styles.fabText}>View Cart</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  categoryRow: { marginTop: 12, marginBottom: 4, flexGrow: 0 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F0DED0", marginRight: 8 },
  categoryChipActive: { backgroundColor: "#7A1B2B" },
  categoryText: { fontSize: 12, color: "#7A1B2B", fontWeight: "600" },
  categoryTextActive: { color: "#FFF" },
  list: { paddingVertical: 12, gap: 14 },
  row: { flexDirection: "row", gap: 12 },
  rowImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#F0DED0" },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: "#3A2A22" },
  rowMeta: { fontSize: 12, color: "#8A6B5C", marginTop: 2 },
  priceBadge: { alignSelf: "flex-start", backgroundColor: "#E8F3E8", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  priceBadgeText: { fontSize: 12, color: "#2E7D32", fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  stepperButton: { width: 28, height: 28, borderRadius: 6, backgroundColor: "#F0DED0", alignItems: "center", justifyContent: "center" },
  stepperButtonText: { fontSize: 16, color: "#7A1B2B", fontWeight: "700" },
  stepperValue: { fontSize: 13, fontWeight: "600", minWidth: 30, textAlign: "center" },
  moqNote: { fontSize: 10, color: "#8A6B5C", marginLeft: 6 },
  empty: { fontSize: 13, color: "#8A6B5C", paddingVertical: 20, textAlign: "center" },
  fab: { position: "absolute", bottom: 16, right: 0, left: 0, marginHorizontal: 20, backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  fabText: { color: "#FFF", fontWeight: "700" },
});
