import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { ProductImage } from "@/components/ProductImage";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { Screen } from "@/components/Screen";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { fetchPublishedProducts } from "@/lib/api/catalogue";
import { fetchCustomerOrderStatus } from "@/lib/api/orders";
import { isOpenFulfilmentStage } from "@/lib/order-stages";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerOrderStatus, CustomerStatement, PublishedProduct } from "@/types/database.types";
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
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isApprovedBuyer = snapshot?.state === "approved_buyer";
      const [productRows, orderRows, statementRow] = await Promise.all([
        fetchPublishedProducts(),
        isApprovedBuyer ? fetchCustomerOrderStatus() : Promise.resolve([]),
        isApprovedBuyer ? customerGateway.statement() : Promise.resolve(null),
      ]);
      setProducts(productRows);
      setOrders(orderRows);
      setStatement(statementRow);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, [snapshot?.state]);

  useEffect(() => {
    load();
  }, [load]);

  const lifetimeValue = useMemo(() => orders.reduce((sum, o) => sum + o.order_value, 0), [orders]);
  const openOrders = useMemo(() => orders.filter((o) => isOpenFulfilmentStage(o.customer_stage)), [orders]);
  const ordersNeedingAdvance = useMemo(
    () => orders.filter((o) => o.payment_stage.toLowerCase().includes("pending") || o.payment_stage.toLowerCase().includes("advance")),
    [orders]
  );
  const delayedOrders = useMemo(() => {
    const now = Date.now();
    return orders.filter((o) => {
      const hours = (now - new Date(o.updated_at).getTime()) / (1000 * 60 * 60);
      return hours > 48 && isOpenFulfilmentStage(o.customer_stage);
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
        {loading ? <LoadingState message="Loading your trade desk…" /> : null}
        {error && !loading ? <ErrorState message={error} onRetry={load} /> : null}

        <View style={styles.quickActions}>
          <ActionChip label="Oasis Genie" onPress={() => navigation.navigate("AiOrder")} />
          <ActionChip label="New Order" onPress={() => navigation.navigate("Catalogue")} />
          <ActionChip label="Quick Order" onPress={() => navigation.navigate("QuickOrder")} />
          <ActionChip label="Quotations" onPress={() => navigation.navigate("Quotations")} />
          <ActionChip label="Track Order" onPress={() => navigation.navigate("Orders")} />
          <ActionChip label="Raise Ticket" onPress={() => navigation.navigate("Support")} />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Lifetime order value" value={`₹${lifetimeValue.toLocaleString("en-IN")}`} />
          <StatCard label="Open orders" value={String(openOrders.length)} />
        </View>

        {statement?.statement_facts_only && statement.wallet_balance !== null ? (
          <View style={styles.statCardWide}>
            <Text style={styles.statLabel}>Wallet balance (statement facts)</Text>
            <Text style={styles.statValue}>₹{statement.wallet_balance.toLocaleString("en-IN")}</Text>
          </View>
        ) : (
          <View style={styles.unavailableCard}>
            <Text style={styles.unavailableTitle}>Wallet & credit</Text>
            <Text style={styles.unavailableMessage}>
              Wallet balance appears here when customer_statement_v1 exposes governed wallet facts.
            </Text>
          </View>
        )}

        {ordersNeedingAdvance.length > 0 ? (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Sales orders requiring advance</Text>
            {ordersNeedingAdvance.slice(0, 3).map((o) => (
              <TouchableOpacity
                key={o.order_id}
                onPress={() =>
                  navigation.navigate("OrderPayment", {
                    orderId: o.order_id,
                    orderNumber: o.order_number,
                  })
                }
                accessibilityRole="button"
              >
                <Text style={styles.alertLine}>
                  #{o.order_number} · ₹{o.order_value.toLocaleString("en-IN")} · {o.payment_stage.replace(/_/g, " ")}
                </Text>
              </TouchableOpacity>
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
  statCardWide: { backgroundColor: colors.surfacePremium, borderRadius: 12, padding: spacing.md, marginTop: spacing.md },
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
