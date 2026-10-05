import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { ProductImage } from "@/components/ProductImage";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { fetchPublishedProducts } from "@/lib/api/catalogue";
import { seasonalProducts } from "@/lib/buyer-merchandising";
import { parseRpcError } from "@/lib/rpc-errors";
import type { PublishedProduct } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "SeasonalCollection">;

/**
 * Shows products only when the governed catalogue explicitly classifies their
 * taxonomy as seasonal/festive. It never guesses from product names or copy.
 */
export function SeasonalCollectionScreen({ navigation }: Props) {
  const [products, setProducts] = useState<PublishedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await fetchPublishedProducts());
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => seasonalProducts(products), [products]);

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Seasonal Collection" subtitle="Published seasonal and festive catalogue classifications" scroll={false}>
        {loading ? (
          <LoadingState message="Loading seasonal catalogue…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.product_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState
                title="No seasonal products are classified right now"
                message="Only products explicitly classified by the published catalogue appear here. Browse the full catalogue for all current products."
                actionLabel="Browse Catalogue"
                onAction={() => navigation.navigate("MainTabs", { screen: "Catalogue" })}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.product_name}`}
                onPress={() => navigation.navigate("ProductDetail", { productId: item.product_id })}
              >
                <ProductImage uri={item.hero_image_url} style={styles.image} />
                <View style={styles.copy}>
                  <Text style={styles.name}>{item.product_name}</Text>
                  <Text style={styles.meta}>
                    {[item.category, item.subcategory, item.pack_size].filter(Boolean).join(" · ") || "Published product"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.md, gap: spacing.md },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surfacePremium,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  image: { width: 88, height: 88 },
  copy: { flex: 1, justifyContent: "center" },
  name: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeLg, color: colors.textPrimary },
  meta: {
    marginTop: 6,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});
