import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchPublishedProducts } from "@/lib/api/catalogue";
import { parseRpcError } from "@/lib/rpc-errors";
import type { PublishedProduct } from "@/types/database.types";
import { colors, spacing, typography, touchTarget } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "CollectionHub">;
type Collection = { name: string; count: number; subcategories: string[] };

/** Groups the live published catalogue without inventing merchandising labels. */
export function CollectionHubScreen({ navigation }: Props) {
  const [products, setProducts] = useState<PublishedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setProducts(await fetchPublishedProducts()); }
    catch (e) { setError(parseRpcError(e).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const collections = useMemo<Collection[]>(() => {
    const grouped = new Map<string, PublishedProduct[]>();
    products.forEach((product) => {
      if (!product.category) return;
      grouped.set(product.category, [...(grouped.get(product.category) ?? []), product]);
    });
    return Array.from(grouped, ([name, items]) => ({
      name,
      count: items.length,
      subcategories: Array.from(new Set(items.map((item) => item.subcategory).filter((x): x is string => Boolean(x)))).sort(),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);
  return (
    <Screen title="Collections" subtitle="Explore the live Oasis trade catalogue" scroll={false}>
      {loading ? <LoadingState message="Loading collections…" /> : error ? <ErrorState message={error} onRetry={load} /> :
        <FlatList data={collections} keyExtractor={(item) => item.name} contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Published collections will appear here when available.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} accessibilityRole="button"
              accessibilityLabel={`Browse ${item.name}`}
              onPress={() => navigation.navigate("MainTabs", { screen: "Catalogue", params: { category: item.name } })}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.count}>{item.count} {item.count === 1 ? "product" : "products"}</Text>
              {item.subcategories.length ? <View style={styles.tags}>{item.subcategories.slice(0, 3).map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View> : null}
              <Text style={styles.action}>Explore collection →</Text>
            </TouchableOpacity>
          )} />}
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { paddingVertical: spacing.md, gap: spacing.md },
  card: { minHeight: touchTarget, padding: spacing.lg, borderRadius: 16, backgroundColor: colors.surfacePremium, borderWidth: 1, borderColor: colors.borderLight },
  title: { fontFamily: typography.fontFamilySerif, fontSize: typography.sizeXl, color: colors.textPrimary },
  count: { marginTop: 6, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  tag: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  action: { marginTop: spacing.lg, fontFamily: typography.fontFamilySansSemiBold, color: colors.action },
  empty: { paddingVertical: spacing.xl, textAlign: "center", fontFamily: typography.fontFamilySans, color: colors.textMuted },
});
