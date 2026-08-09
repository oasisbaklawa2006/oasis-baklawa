import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { ProductImage } from "@/components/ProductImage";
import { Screen } from "@/components/Screen";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { fetchPublishedProducts } from "@/lib/api/catalogue";
import { fetchCustomerOrderStatus } from "@/lib/api/orders";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerOrderStatus, PublishedProduct } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Dashboard">,
  NativeStackScreenProps<RootStackParamList>
>;

const ANNOUNCEMENTS = [
  "Festival gifting collections now open for pre-order",
  "New artisan range available for approved buyers",
];

export function DashboardScreen({ navigation }: Props) {
  const { snapshot } = useBuyerSession();
  const [products, setProducts] = useState<PublishedProduct[]>([]);
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [productRows, orderRows] = await Promise.all([fetchPublishedProducts(), fetchCustomerOrderStatus()]);
      setProducts(productRows);
      setOrders(orderRows);
    } catch (e) {
      setError(parseRpcError(e).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lifetimeValue = useMemo(() => orders.reduce((sum, o) => sum + o.order_value, 0), [orders]);
  const ordersNeedingAdvance = useMemo(
    () => orders.filter((o) => o.payment_stage.toLowerCase().includes("pending") || o.payment_stage.toLowerCase().includes("advance")),
    [orders]
  );
  const delayedOrders = useMemo(() => {
    const now = Date.now();
    return orders.filter((o) => {
      const hours = (now - new Date(o.updated_at).getTime()) / (1000 * 60 * 60);
      return hours > 48 && !o.customer_stage.toLowerCase().includes("delivered");
    });
  }, [orders]);
  const bestSellers = useMemo(() => products.slice(0, 6), [products]);

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")} requireApprovedBuyer={false}>
      <Screen title="Home" subtitle="Your Oasis trade desk">
        {snapshot?.message && snapshot.state !== "approved_buyer" ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{snapshot.message}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.quickActions}>
          <ActionChip label="New Order" onPress={() => navigation.navigate("Catalogue")} />
          <ActionChip label="Quick Order" onPress={() => navigation.navigate("QuickOrder")} />
          <ActionChip label="Track Order" onPress={() => navigation.navigate("Orders")} />
          <ActionChip label="Raise Ticket" onPress={() => navigation.navigate("Support")} />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Lifetime orders" value={`₹${lifetimeValue.toLocaleString("en-IN")}`} />
          <StatCard label="Open orders" value={String(orders.length)} />
        </View>

        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableTitle}>Wallet & credit</Text>
          <Text style={styles.unavailableMessage}>
            Credit pool and wallet balances are not yet exposed by a governed buyer contract. This section will populate when the backend contract is available.
          </Text>
        </View>

        {ordersNeedingAdvance.length > 0 ? (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Sales orders requiring advance</Text>
            {ordersNeedingAdvance.slice(0, 3).map((o) => (
              <Text key={o.order_id} style={styles.alertLine}>
                #{o.order_number} · ₹{o.order_value.toLocaleString("en-IN")} · {o.payment_stage.replace(/_/g, " ")}
              </Text>
            ))}
          </View>
        ) : null}

        {delayedOrders.length > 0 ? (
          <View style={styles.warningCard}>
            <Text style={styles.alertTitle}>Orders needing attention</Text>
            {delayedOrders.slice(0, 3).map((o) => (
              <Text key={o.order_id} style={styles.alertLine}>
                #{o.order_number} · {o.customer_stage.replace(/_/g, " ")}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.section}>Announcements</Text>
        {ANNOUNCEMENTS.map((a) => (
          <Text key={a} style={styles.announcement}>
            {a}
          </Text>
        ))}

        <Text style={styles.section}>Best sellers</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={bestSellers}
          keyExtractor={(item) => item.product_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => navigation.navigate("ProductDetail", { productId: item.product_id })}
              accessibilityRole="button"
            >
              <ProductImage uri={item.hero_image_url} style={styles.productImage} />
              <Text numberOfLines={2} style={styles.productName}>
                {item.product_name}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No products published yet.</Text>}
        />

        <TouchableOpacity style={styles.cartFab} onPress={() => navigation.navigate("Cart")} accessibilityRole="button">
          <Text style={styles.cartFabText}>View draft cart</Text>
        </TouchableOpacity>
      </Screen>
    </BuyerGate>
  );
}

function ActionChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.warningSurface, borderRadius: 10, padding: spacing.md, marginTop: spacing.md },
  bannerText: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.warning },
  error: { color: colors.error, marginTop: spacing.sm },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  chip: { backgroundColor: colors.action, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, minHeight: 44, justifyContent: "center" },
  chipText: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.white },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surfacePremium, borderRadius: 12, padding: spacing.md },
  statLabel: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted },
  statValue: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeLg, color: colors.textPrimary, marginTop: 4 },
  alertCard: { backgroundColor: colors.successSurface, borderRadius: 12, padding: spacing.md, marginTop: spacing.md },
  warningCard: { backgroundColor: colors.warningSurface, borderRadius: 12, padding: spacing.md, marginTop: spacing.md },
  alertTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  alertLine: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, marginTop: 4 },
  section: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeLg, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  announcement: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, marginBottom: 4 },
  productCard: { width: 120, marginRight: spacing.md },
  productImage: { width: 120, height: 100 },
  productName: { fontFamily: typography.fontFamilySansMedium, fontSize: typography.sizeXs, color: colors.textPrimary, marginTop: 6 },
  empty: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  cartFab: { backgroundColor: colors.textPrimary, padding: spacing.md, borderRadius: 10, alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl, minHeight: 44, justifyContent: "center" },
  cartFabText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  unavailableCard: { backgroundColor: colors.surfaceUtility, borderRadius: 12, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  unavailableTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  unavailableMessage: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
});
