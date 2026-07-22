import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { CustomerOrderItem, CustomerOrderStatus } from '@/contracts/customerGateway';
import { customerGateway } from '@/services/customerGateway';

const timeline = ['confirmed', 'production', 'assembly', 'packing', 'packed_ready', 'cleared_for_dispatch', 'dispatched', 'delivered'];

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<CustomerOrderStatus | null>(null);
  const [items, setItems] = useState<CustomerOrderItem[]>([]);
  const [message, setMessage] = useState('Loading order details…');

  useEffect(() => {
    Promise.all([customerGateway.orders(), customerGateway.orderItems()])
      .then(([orders, rows]) => {
        setOrder(orders.find((entry) => entry.order_id === orderId) ?? null);
        setItems(rows.filter((entry) => entry.order_id === orderId));
        setMessage('');
      })
      .catch(() => setMessage('Order details are temporarily unavailable.'));
  }, [orderId]);

  const currentIndex = useMemo(() => {
    if (!order) return -1;
    return timeline.indexOf(order.order_status);
  }, [order]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Orders</Text></TouchableOpacity>
        <Text style={styles.kicker}>ORDER DETAIL</Text>
        <Text style={styles.title}>{order?.order_number ?? 'Order'}</Text>
        {message ? <Text style={styles.copy}>{message}</Text> : null}
      </View>

      {order ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.order_item_id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.timelineCard}>
              <Text style={styles.sectionTitle}>Progress</Text>
              {timeline.map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <View style={[styles.dot, index <= currentIndex && styles.dotActive]} />
                  <Text style={[styles.stepText, index <= currentIndex && styles.stepTextActive]}>{step.replaceAll('_', ' ')}</Text>
                </View>
              ))}
            </View>
          }
          ListEmptyComponent={<Text style={styles.copy}>No item lines are currently visible for this order.</Text>}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <Text style={styles.itemMeta}>Ordered: {item.ordered_quantity} {item.uom ?? ''}</Text>
              {item.packed_quantity !== null ? <Text style={styles.itemMeta}>Packed: {item.packed_quantity} {item.uom ?? ''}</Text> : null}
            </View>
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF9' },
  header: { padding: 24, gap: 7 },
  back: { color: '#7C5B2A', fontWeight: '700', marginBottom: 8 },
  kicker: { letterSpacing: 2, fontSize: 12, fontWeight: '700', color: '#7C5B2A' },
  title: { fontSize: 32, fontWeight: '700', color: '#20160E' },
  copy: { color: '#5A493A', lineHeight: 22 },
  content: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  timelineCard: { padding: 20, borderRadius: 18, backgroundColor: '#F7F1E7', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#20160E', marginBottom: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 34 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D8CCBB' },
  dotActive: { backgroundColor: '#7C5B2A' },
  stepText: { textTransform: 'capitalize', color: '#8A796A' },
  stepTextActive: { color: '#20160E', fontWeight: '700' },
  itemCard: { padding: 18, borderRadius: 16, backgroundColor: '#F7F1E7' },
  itemName: { fontSize: 17, fontWeight: '700', color: '#20160E' },
  itemMeta: { marginTop: 6, color: '#5A493A' },
});
