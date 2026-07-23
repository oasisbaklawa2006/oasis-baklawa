import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useCart } from '@/cart/CartProvider';

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function CartScreen() {
  const { lines, hydrated, increase, decrease, remove, clear } = useCart();
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const currency = lines[0]?.currency ?? 'INR';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.kicker}>TRADE CART</Text>
        <Text style={styles.title}>Your cart</Text>
        <Text style={styles.copy}>
          Quantities stay aligned to the governed MOQ and order increment returned for your buyer account.
        </Text>
      </View>

      <FlatList
        data={lines}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>{hydrated ? 'Your cart is empty' : 'Loading your cart…'}</Text>
            <Text style={styles.cardCopy}>
              Add approved buyer products from Catalogue. Checkout remains disabled until a governed server-side order-submission contract is available.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.grow}>
                <Text style={styles.cardTitle}>{item.productName}</Text>
                <Text style={styles.meta}>
                  MOQ {item.minimumOrderQuantity} {item.uom} · increments of {item.orderIncrement} {item.uom}
                </Text>
              </View>
              <TouchableOpacity onPress={() => remove(item.productId)}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quantityRow}>
              <TouchableOpacity style={styles.stepper} onPress={() => decrease(item.productId)}>
                <Text style={styles.stepperText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantity}>{item.quantity} {item.uom}</Text>
              <TouchableOpacity style={styles.stepper} onPress={() => increase(item.productId)}>
                <Text style={styles.stepperText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.lineTotal}>
              {formatMoney(item.unitPrice * item.quantity, item.currency)}
            </Text>
          </View>
        )}
        ListFooterComponent={
          lines.length ? (
            <View style={styles.summary}>
              <View style={styles.rowBetween}>
                <Text style={styles.summaryLabel}>Estimated total</Text>
                <Text style={styles.summaryValue}>{formatMoney(total, currency)}</Text>
              </View>
              <Text style={styles.notice}>
                Final price, tax, freight and availability must be validated by the future governed checkout RPC.
              </Text>
              <TouchableOpacity disabled style={styles.disabledButton}>
                <Text style={styles.disabledButtonText}>Checkout unavailable</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clear}>
                <Text style={styles.clear}>Clear cart</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF9' },
  header: { padding: 24, paddingBottom: 10, gap: 10 },
  kicker: { letterSpacing: 2, fontSize: 12, fontWeight: '700', color: '#7C5B2A' },
  title: { fontSize: 34, fontWeight: '700', color: '#20160E' },
  copy: { fontSize: 15, lineHeight: 22, color: '#5A493A' },
  list: { padding: 24, paddingTop: 10, gap: 14 },
  card: { padding: 18, borderRadius: 16, backgroundColor: '#F7F1E7', gap: 16 },
  emptyCard: { padding: 20, borderRadius: 16, backgroundColor: '#F7F1E7' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#20160E' },
  cardCopy: { marginTop: 8, lineHeight: 22, color: '#5A493A' },
  meta: { marginTop: 6, lineHeight: 20, color: '#6A5847' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  remove: { color: '#9C3F2B', fontWeight: '700' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepper: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#B99669', alignItems: 'center', justifyContent: 'center' },
  stepperText: { fontSize: 24, color: '#4A2E12' },
  quantity: { minWidth: 90, textAlign: 'center', fontWeight: '700', color: '#20160E' },
  lineTotal: { fontSize: 18, fontWeight: '700', color: '#4A2E12' },
  summary: { marginTop: 8, padding: 20, borderRadius: 18, backgroundColor: '#20160E', gap: 14 },
  summaryLabel: { color: '#E8DCCF' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  notice: { lineHeight: 20, color: '#D8C7B5' },
  disabledButton: { padding: 16, borderRadius: 14, backgroundColor: '#5E5146' },
  disabledButtonText: { textAlign: 'center', fontWeight: '800', color: '#CFC5BA' },
  clear: { textAlign: 'center', padding: 8, color: '#E8DCCF', fontWeight: '700' },
});
