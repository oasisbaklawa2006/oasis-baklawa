import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { ProductImage } from "@/components/ProductImage";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { recommendedProducts } from "@/lib/buyer-merchandising";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway, type CatalogueProduct } from "@/services/customerGateway";
import type { CustomerOrderItem, CustomerProductFavourite } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Recommended">;

/**
 * Buyer-specific recommendations use only explicit first-party signals:
 * favourites and the buyer's own order history. There is no popularity or
 * similarity fallback when those signals do not exist.
 */
export function RecommendedScreen({ navigation }: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);
  const [favourites, setFavourites] = useState<CustomerProductFavourite[]>([]);
  const [orderItems, setOrderItems] = useState<CustomerOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogueRows, favouriteRows, itemRows] = await Promise.all([
        customerGateway.catalogue(),
        customerGateway.favourites(),
        customerGateway.orderItems(),
      ]);
      setCatalogue(catalogueRows);
      setFavourites(favouriteRows ?? []);
      setOrderItems(itemRows ?? []);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () => recommendedProducts({ products: catalogue, favourites, orderItems }),
    [catalogue, favourites, orderItems]
  );

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Recommended for You" subtitle="Based only on your favourites and previous Oasis orders" scroll={false}>
        {loading ? (
          <LoadingState message="Building your recommendations…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.product_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState
                title="No recommendations yet"
                message="Favourite a product or place an order and eligible published products will appear here. We do not guess recommendations without a buyer signal."
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
                    {[item.category, item.pack_size].filter(Boolean).join(" · ") || "Published product"}
                  </Text>
                  <Text style={styles.signal}>
                    {favourites.some((row) => row.product_id === item.product_id)
                      ? "Saved in your favourites"
                      : "Previously ordered by your account"}
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
  meta: { marginTop: 5, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  signal: { marginTop: 7, fontFamily: typography.fontFamilySansMedium, fontSize: typography.sizeXs, color: colors.accentBronze },
});
