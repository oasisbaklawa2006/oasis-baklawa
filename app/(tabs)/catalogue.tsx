import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useCart } from '@/cart/CartProvider';
import type { BuyerProductPrice, PublishedProduct } from '@/contracts/customerGateway';
import { customerGateway } from '@/services/customerGateway';

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

export default function CatalogueScreen() {
  const [products, setProducts] = useState<PublishedProduct[]>([]);
  const [prices, setPrices] = useState<BuyerProductPrice[]>([]);
  const [message, setMessage] = useState('Loading collection…');
  const { lines, addProduct } = useCart();

  useEffect(() => {
    let active = true;
    Promise.allSettled([customerGateway.products(), customerGateway.prices()]).then(
      ([productResult, priceResult]) => {
        if (!active) return;
        if (productResult.status === 'rejected') {
          setMessage('Catalogue is temporarily unavailable.');
          return;
        }
        setProducts(productResult.value);
        setMessage(productResult.value.length ? '' : 'No published products available.');
        if (priceResult.status === 'fulfilled') setPrices(priceResult.value);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const priceByProduct = useMemo(
    () => new Map(prices.map((price) => [price.product_id, price])),
    [prices],
  );
  const cartProductIds = useMemo(() => new Set(lines.map((line) => line.productId)), [lines]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Catalogue</Text>
        <Text style={styles.copy}>Approved buyer pricing, MOQ and ordering increments appear after sign-in.</Text>
      </View>
      <FlatList
        data={products}
        keyExtractor={(item) => item.product_id}
        ListEmptyComponent={<Text style={styles.empty}>{message}</Text>}
        renderItem={({ item }) => {
          const price = priceByProduct.get(item.product_id);
          const inCart = cartProductIds.has(item.product_id);
          return (
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/products/[productId]', params: { productId: item.product_id } })}
              >
                <Text style={styles.name}>{item.product_name}</Text>
                <Text style={styles.category}>{item.category ?? 'Oasis collection'}</Text>
                <Text style={styles.detailsLink}>View product details</Text>
              </TouchableOpacity>
              {price ? (
                <View style={styles.commercialBlock}>
                  <Text style={styles.price}>{formatMoney(price.unit_price, price.currency)}</Text>
                  <Text style={styles.commercialText}>MOQ {price.minimum_order_quantity} {price.minimum_order_uom}</Text>
                  <Text style={styles.commercialText}>Order in increments of {price.order_increment} {price.order_increment_uom}</Text>
                  <TouchableOpacity
                    disabled={inCart}
                    style={[styles.addButton, inCart && styles.addButtonDisabled]}
                    onPress={() => addProduct({
                      productId: item.product_id,
                      productName: item.product_name,
                      minimumOrderQuantity: price.minimum_order_quantity,
                      orderIncrement: price.order_increment,
                      uom: price.minimum_order_uom,
                      unitPrice: price.unit_price,
                      currency: price.currency,
                    })}
                  >
                    <Text style={styles.addButtonText}>{inCart ? 'Added to cart' : 'Add minimum quantity'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.signInHint}>Sign in with an approved buyer account for pricing.</Text>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF9' },
  header: { padding: 24, gap: 8 },
  title: { fontSize: 34, fontWeight: '700', color: '#20160E' },
  copy: { color: '#5A493A', lineHeight: 20 },
  card: { marginHorizontal: 24, marginBottom: 14, padding: 18, borderRadius: 16, backgroundColor: '#F7F1E7' },
  name: { fontSize: 18, fontWeight: '700', color: '#20160E' },
  category: { marginTop: 6, color: '#7C5B2A' },
  detailsLink: { marginTop: 8, color: '#7C5B2A', fontWeight: '700' },
  commercialBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D8C5A7', gap: 4 },
  price: { fontSize: 20, fontWeight: '700', color: '#4A2E12' },
  commercialText: { color: '#5A493A' },
  addButton: { marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: '#20160E' },
  addButtonDisabled: { backgroundColor: '#786B60' },
  addButtonText: { textAlign: 'center', fontWeight: '800', color: '#FFF' },
  signInHint: { marginTop: 14, color: '#7C5B2A', fontStyle: 'italic' },
  empty: { padding: 24, color: '#5A493A' },
});
