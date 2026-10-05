import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCatalogue } from "@/lib/api/catalogue";
import { addCustomerOrderDraftLine } from "@/lib/api/draft";
import { fetchCustomerOrderItems } from "@/lib/api/orders";
import { resolveCommercialRules, validateOrderQuantity } from "@/lib/buyer-commercial-validation";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerOrderItem } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Reorder">;
type ReorderRow = CustomerOrderItem & { orderable: boolean; reason?: string };

export function ReorderScreen({ navigation, route }: Props) {
  const [rows, setRows] = useState<ReorderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [items, catalogue] = await Promise.all([fetchCustomerOrderItems(), fetchCatalogue({ includeBuyerPrices: true })]);
      const source = items.filter((item) => item.order_id === route.params.orderId);
      setRows(source.map((item) => {
        const current = catalogue.find((product) => product.product_id === item.product_id);
        if (!current) return { ...item, orderable: false, reason: "No longer available in the current catalogue." };
        const commercial = resolveCommercialRules(current.price);
        if (!commercial.orderable || !commercial.rules) return { ...item, orderable: false, reason: commercial.message ?? "Current pricing is unavailable." };
        const validation = validateOrderQuantity(item.quantity, commercial.rules);
        return validation.valid ? { ...item, orderable: true } : { ...item, orderable: false, reason: "Quantity needs review under current order rules." };
      }));
    } catch (e) { setError(parseRpcError(e).message); }
    finally { setLoading(false); }
  }, [route.params.orderId]);
  useEffect(() => { void load(); }, [load]);
  const orderable = useMemo(() => rows.filter((row) => row.orderable), [rows]);
  async function addAgain() {
    setBusy(true); setError(null);
    try {
      for (const row of orderable) await addCustomerOrderDraftLine(row.product_id, row.quantity);
      navigation.navigate("Cart");
    } catch (e) { setError(parseRpcError(e).message); }
    finally { setBusy(false); }
  }
  return <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
    <Screen title="Order Again" subtitle="Review against today's catalogue and order rules" scroll={false}>
      {loading ? <LoadingState message="Checking your previous order…" /> : error ? <ErrorState message={error} onRetry={load} /> :
      <FlatList data={rows} keyExtractor={(item) => item.item_id} contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No items were found for this order.</Text>}
        renderItem={({ item }) => <View style={styles.row}><View style={styles.info}><Text style={styles.title}>{item.product_name}</Text><Text style={styles.meta}>{item.sku} · Previous quantity {item.quantity}</Text>{!item.orderable ? <Text style={styles.warning}>{item.reason}</Text> : <Text style={styles.available}>Available to add at the previous quantity</Text>}</View></View>}
        ListFooterComponent={rows.length ? <View style={styles.footer}><Text style={styles.note}>Prices and availability are checked from the current catalogue. Nothing is copied from the old order price.</Text><OasisButton label={busy ? "Adding…" : `Add ${orderable.length} item${orderable.length === 1 ? "" : "s"} to cart`} disabled={busy || !orderable.length} onPress={addAgain}/></View> : null} />}
    </Screen>
  </BuyerGate>;
}
const styles=StyleSheet.create({list:{paddingVertical:spacing.md,gap:spacing.sm},row:{padding:spacing.md,borderRadius:14,backgroundColor:colors.surfacePremium,borderWidth:1,borderColor:colors.borderLight},info:{flex:1},title:{fontFamily:typography.fontFamilySansSemiBold,fontSize:typography.sizeMd,color:colors.textPrimary},meta:{marginTop:4,fontFamily:typography.fontFamilySans,fontSize:typography.sizeXs,color:colors.textMuted},available:{marginTop:spacing.sm,fontFamily:typography.fontFamilySansMedium,fontSize:typography.sizeXs,color:colors.success},warning:{marginTop:spacing.sm,fontFamily:typography.fontFamilySansMedium,fontSize:typography.sizeXs,color:colors.error},footer:{gap:spacing.md,marginTop:spacing.md},note:{fontFamily:typography.fontFamilySans,fontSize:typography.sizeXs,color:colors.textSecondary,lineHeight:18},empty:{paddingVertical:spacing.xl,textAlign:"center",fontFamily:typography.fontFamilySans,color:colors.textMuted}});
