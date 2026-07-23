import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useCart } from '@/cart/CartProvider';
import type { BuyerProductPrice, PublishedProduct } from '@/contracts/customerGateway';
import { customerGateway } from '@/services/customerGateway';

type QuickOrderRow = {
  product: PublishedProduct;
  price: BuyerProductPrice;
};

export default function QuickOrderScreen() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<QuickOrderRow[]>([]);
  const [message, setMessage] = useState('Loading approved buyer products…');
  const { lines, addProduct } = useCart();

  useEffect(() => {
    let active = true;
    Promise.all([customerGateway.products(), customerGateway.prices()])
      .then(([products, prices]) => {
        if (!active) return;
        const productById = new Map(products.map((product) => [product.product_id, product]));
        const nextRows = prices.flatMap((price) => {
          const product = productById.get(price.product_id);
          return product ? [{ product, price }] : [];
        });
        setRows(nextRows);
        setMessage(nextRows.length ? '' : 'No approved buyer products are available.');
      })
      .catch(() => {
        if (active) setMessage('Quick Order is temporarily unavailable.');
      });
    return () => {
      active = false;
    };
  }, []);

  const cartProductIds = useMemo(() => new Set(lines.map((line) => line.productId)), [lines]);
  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(({ product }) =>
      [product.product_name, product.sku ?? '', product.category ?? '']
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [query, rows]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.kicker}>QUICK ORDER</Text>
        <Text style={styles.title}>Add regular SKUs fast.</Text>
        <Text style={styles.copy}>Search by product, SKU or category. Every line starts at the governed MOQ and follows the approved order increment.</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search product or SKU"
          autoCapitalize="none"
          style={styles.search}
        />
      </View>
      <FlatList
        data={filteredRows}
        keyExtractor={({ product }) => product.product_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{message || 'No matching products.'}</Text>}
        renderItem={({ item: { product, price } }) => {
          const inCart = cartProductIds.has(product.product_id);
          return (
            <View style={styles.card}>
              <Text style={styles.name}>{product.product_name}</Text>
              <Text style={styles.meta}>{product.sku ?? 'SKU pending'} · {product.category ?? 'Oasis collection'}</Text>
              <Text style={styles.meta}>MOQ {price.minimum_order_quantity} {price.minimum_order_uom} · increments of {price.order_increment} {price.order_increment_uom}</Text>
              <TouchableOpacity
                disabled={inCart}
                style={[styles.button, inCart && styles.buttonDisabled]}
                onPress={() => addProduct({
                  productId: product.product_id,
                  productName: product.product_name,
                  minimumOrderQuantity: price.minimum_order_quantity,
                  orderIncrement: price.order_increment,
                  uom: price.minimum_order_uom,
                  unitPrice: price.unit_price,
                  currency: price.currency,
                })}
              >
                <Text style={styles.buttonText}>{inCart ? 'Already in cart' : 'Add MOQ to cart'}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF9' },
  header: { padding: 24, paddingBottom: 10, gap: 10 },
  back: { color: '#7C5B2A', fontWeight: '700' },
  kicker: { letterSpacing: 2, fontSize: 12, fontWeight: '800', color: '#7C5B2A' },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#20160E' },
  copy: { lineHeight: 22, color: '#5A493A' },
  search: { marginTop: 8, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: '#D7C4A8', backgroundColor: '#FFF' },
  list: { padding: 24, paddingTop: 10, gap: 14 },
  card: { padding: 18, borderRadius: 16, backgroundColor: '#F7F1E7', gap: 9 },
  name: { fontSize: 18, fontWeight: '800', color: '#20160E' },
  meta: { lineHeight: 20, color: '#665443' },
  button: { marginTop: 6, padding: 14, borderRadius: 12, backgroundColor: '#20160E' },
  buttonDisabled: { backgroundColor: '#786B60' },
  buttonText: { textAlign: 'center', fontWeight: '800', color: '#FFF' },
  empty: { padding: 24, color: '#5A493A' },
});
