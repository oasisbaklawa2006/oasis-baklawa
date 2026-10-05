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
import { buyerFulfilmentStageLabel, isOpenFulfilmentStage } from "@/lib/order-stages";
import { recentlyAddedProducts } from "@/lib/buyer-merchandising";
import { GENIE_ENABLED } from "@/lib/genie-parse-availability";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerOrderStatus, CustomerStatement, PublishedProduct } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Dashboard">,
  NativeStackScreenProps<RootStackParamList>
>;


/** Presents the buyer home surface with one next-best action and concise commercial context. */
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
        isApprovedBuyer
          ? customerGateway.statement().catch(() => null)
          : Promise.resolve(null),
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
  const recentProducts = useMemo(() => recentlyAddedProducts(products, 6), [products]);

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")} requireApprovedBuyer={false}>
      <Screen title={snapshot?.company?.business_name ? `Welcome, ${snapshot.company.business_name}` : "Welcome to Oasis"} subtitle={snapshot?.state === "approved_buyer" ? "Oasis Trade Partner · B2B · Approved" : "Your Oasis trade account"}>
        {snapshot?.message && snapshot.state !== "approved_buyer" ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{snapshot.message}</Text>
          </View>
        ) : null}
        {loading ? <LoadingState message="Loading your trade desk…" /> : null}
        {error && !loading ? <ErrorState message={error} onRetry={load} /> : null}

        {ordersNeedingAdvance[0] ? (
          <View style={styles.nextActionCard}>
            <Text style={styles.nextActionEyebrow}>YOUR NEXT STEP</Text>
            <Text style={styles.nextActionTitle}>Your order is ready to proceed</Text>
            <Text style={styles.nextActionCopy}>
              Complete the required advance so we can begin preparing your order.
            </Text>
            <Text style={styles.nextActionAmount}>
              ₹{ordersNeedingAdvance[0].order_value.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.nextActionMeta}>Order #{ordersNeedingAdvance[0].order_number}</Text>
            <TouchableOpacity
              style={styles.nextActionButton}
              onPress={() =>
                navigation.navigate("OrderPayment", {
                  orderId: ordersNeedingAdvance[0].order_id,
                  orderNumber: ordersNeedingAdvance[0].order_number,
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.nextActionButtonText}>View payment</Text>
            </TouchableOpacity>
          </View>
        ) : openOrders[0] ? (
          <TouchableOpacity
            style={styles.nextActionCard}
            onPress={() => navigation.navigate("OrderDetail", { orderId: openOrders[0].order_id, order: openOrders[0] })}
            accessibilityRole="button"
          >
            <Text style={styles.nextActionEyebrow}>YOUR ORDER</Text>
            <Text style={styles.nextActionTitle}>Your order is being prepared</Text>
            <Text style={styles.nextActionCopy}>Order #{openOrders[0].order_number} · View progress</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextActionCard}
            onPress={() => navigation.navigate("Catalogue")}
            accessibilityRole="button"
          >
            <Text style={styles.nextActionEyebrow}>READY WHEN YOU ARE</Text>
            <Text style={styles.nextActionTitle}>Ready for your next order?</Text>
            <Text style={styles.nextActionCopy}>Explore the Oasis trade collection.</Text>
          </TouchableOpacity>
        )}

        {ordersNeedingAdvance[0] && openOrders[0] ? (
          <TouchableOpacity style={styles.orderSnapshot} onPress={() => navigation.navigate("OrderDetail", { orderId: openOrders[0].order_id, order: openOrders[0] })} accessibilityRole="button">
            <Text style={styles.statLabel}>ACTIVE ORDER</Text>
            <Text style={styles.orderSnapshotTitle}>#{openOrders[0].order_number} · {buyerFulfilmentStageLabel(openOrders[0].customer_stage)}</Text>
            <Text style={styles.nextActionCopy}>View order progress</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.section}>Quick actions</Text>
        <View style={styles.quickActions}>
          <ActionChip label="New Order" onPress={() => navigation.navigate("Catalogue")} />
          <ActionChip label="Quick Order" onPress={() => navigation.navigate("QuickOrder")} />
          <ActionChip label="Track Order" onPress={() => navigation.navigate("Orders")} />
          <ActionChip label="Support" onPress={() => navigation.navigate("Support")} />
        </View>
        {GENIE_ENABLED ? (
          <TouchableOpacity style={styles.genieEntry} onPress={() => navigation.navigate("AiOrder")} accessibilityRole="button">
            <Text style={styles.genieEyebrow}>OASIS GENIE</Text>
            <Text style={styles.genieTitle}>Build an order with assistance</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.section}>Account overview</Text>
        <View style={styles.statsRow}>
          <StatCard label="Lifetime order value" value={`₹${lifetimeValue.toLocaleString("en-IN")}`} />
          <StatCard label="Open orders" value={String(openOrders.length)} />
        </View>

        {statement?.statement_facts_only && statement.wallet_balance !== null ? (
          <View style={styles.statCardWide}>
            <Text style={styles.statLabel}>Wallet balance</Text>
            <Text style={styles.statValue}>₹{statement.wallet_balance.toLocaleString("en-IN")}</Text>
          </View>
        ) : (
          <View style={styles.unavailableCard}>
            <Text style={styles.unavailableTitle}>Wallet & credit</Text>
            <Text style={styles.unavailableMessage}>
              Your wallet balance will appear here when available.
            </Text>
          </View>
        )}

        {delayedOrders.length > 0 ? (
          <View style={styles.warningCard}>
            <Text style={styles.alertTitle}>Orders needing attention</Text>
            {delayedOrders.slice(0, 3).map((o) => (
              <Text key={o.order_id} style={styles.alertLine}>
                #{o.order_number} · {buyerFulfilmentStageLabel(o.customer_stage)}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.section}>Recently added</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={recentProducts}
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
          <Text style={styles.cartFabText}>View cart</Text>
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
  nextActionCard: { backgroundColor: colors.surfacePremium, borderRadius: 18, padding: spacing.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.accentChampagne },
  nextActionEyebrow: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXs, color: colors.accentBronze, letterSpacing: 1.1 },
  nextActionTitle: { marginTop: spacing.sm, fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeXl, color: colors.textPrimary },
  nextActionCopy: { marginTop: spacing.sm, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, lineHeight: 20 },
  nextActionAmount: { marginTop: spacing.md, fontFamily: typography.fontFamilySansBold, fontSize: typography.sizeXxl, color: colors.textPrimary },
  nextActionMeta: { marginTop: 2, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  nextActionButton: { minHeight: 48, marginTop: spacing.md, borderRadius: 24, backgroundColor: colors.dark, alignItems: "center", justifyContent: "center" },
  nextActionButtonText: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.accentGold },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  chip: { width: "48%", flexGrow: 1, backgroundColor: colors.action, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, minHeight: 56, justifyContent: "center", alignItems: "center" },
  genieEntry: { backgroundColor: colors.surfaceUtility, borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, minHeight: 64, justifyContent: "center", marginTop: spacing.sm },
  genieEyebrow: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXs, color: colors.accentBronze, letterSpacing: 1 },
  genieTitle: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeMd, color: colors.textPrimary, marginTop: 4 },
  chipText: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.white },
  orderSnapshot: { backgroundColor: colors.surfacePremium, borderRadius: 14, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  orderSnapshotTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary, marginTop: 4 },
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
  productCard: { width: 120, marginRight: spacing.md },
  productImage: { width: 120, height: 120 },
  productName: { fontFamily: typography.fontFamilySansMedium, fontSize: typography.sizeXs, color: colors.textPrimary, marginTop: 6 },
  empty: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  cartFab: { backgroundColor: colors.textPrimary, padding: spacing.md, borderRadius: 10, alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl, minHeight: 48, justifyContent: "center" },
  cartFabText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  unavailableCard: { backgroundColor: colors.surfaceUtility, borderRadius: 12, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  unavailableTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  unavailableMessage: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
});
