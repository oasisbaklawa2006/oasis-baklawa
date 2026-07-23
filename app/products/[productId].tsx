import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{ productId?: string | string[] }>();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const [product, setProduct] = useState<PublishedProduct | null>(null);
  const [price, setPrice] = useState<BuyerProductPrice | null>(null);
  const [message, setMessage] = useState('Loading product…');
  const { lines, addProduct } = useCart();

  useEffect(() => {
    if (!productId) {
      setMessage('Product reference is missing.');
      return;
    }

    let active = true;
    Promise.allSettled([customerGateway.products(), customerGateway.prices()]).then(
      ([productResult, priceResult]) => {
        if (!active) return;
        if (productResult.status === 'rejected') {
          setMessage('Product details are temporarily unavailable.');
          return;
        }

        const nextProduct = productResult.value.find((item) => item.product_id === productId) ?? null;
        setProduct(nextProduct);
        setMessage(nextProduct ? '' : 'This published product could not be found.');

        if (priceResult.status === 'fulfilled') {
          setPrice(priceResult.value.find((item) => item.product_id === productId) ?? null);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [productId]);

  const inCart = useMemo(
    () => Boolean(productId && lines.some((line) => line.productId === productId)),
    [lines, productId],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>

        {!product ? (
          <View style={styles.messageCard}>
            <Text style={styles.message}>{message}</Text>
          </View>
        ) : (
          <>
            {product.hero_image_url ? (
              <Image source={{ uri: product.hero_image_url }} style={styles.hero} resizeMode="cover" />
            ) : (
              <View style={styles.heroFallback}>
                <Text style={styles.heroFallbackText}>Oasis Baklawa</Text>
              </View>
            )}

            <Text style={styles.kicker}>{product.category ?? 'OASIS COLLECTION'}</Text>
            <Text style={styles.title}>{product.product_name}</Text>
            <Text style={styles.sku}>{product.sku ?? 'SKU pending'}</Text>
            <Text style={styles.description}>{product.description ?? 'Approved product details will appear here when available.'}</Text>

            {price ? (
              <View style={styles.commercialCard}>
                <Text style={styles.price}>{formatMoney(price.unit_price, price.currency)}</Text>
                <Text style={styles.meta}>MOQ {price.minimum_order_quantity} {price.minimum_order_uom}</Text>
                <Text style={styles.meta}>Order increments {price.order_increment} {price.order_increment_uom}</Text>
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
            ) : (
              <View style={styles.privateCard}>
                <Text style={styles.privateTitle}>Buyer pricing is private</Text>
                <Text style={styles.privateCopy}>Sign in with an approved buyer account to see pricing, MOQ and order increments.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF9' },
  body: { padding: 24, gap: 14 },
  back: { color: '#7C5B2A', fontWeight: '700' },
  hero: { width: '100%', aspectRatio: 1.25, borderRadius: 22, backgroundColor: '#F0E5D6' },
  heroFallback: { width: '100%', aspectRatio: 1.25, borderRadius: 22, backgroundColor: '#F0E5D6', alignItems: 'center', justifyContent: 'center' },
  heroFallbackText: { color: '#7C5B2A', fontSize: 22, fontWeight: '800' },
  kicker: { marginTop: 8, letterSpacing: 2, fontSize: 12, fontWeight: '800', color: '#7C5B2A' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: '#20160E' },
  sku: { color: '#7B6A59', fontWeight: '600' },
  description: { fontSize: 16, lineHeight: 24, color: '#5A493A' },
  commercialCard: { marginTop: 8, padding: 20, borderRadius: 18, backgroundColor: '#20160E', gap: 9 },
  price: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  meta: { color: '#E4D7C8' },
  button: { marginTop: 8, padding: 15, borderRadius: 13, backgroundColor: '#FFF' },
  buttonDisabled: { backgroundColor: '#6A5C50' },
  buttonText: { textAlign: 'center', fontWeight: '800', color: '#20160E' },
  privateCard: { marginTop: 8, padding: 20, borderRadius: 18, backgroundColor: '#F7F1E7', gap: 8 },
  privateTitle: { fontSize: 18, fontWeight: '800', color: '#20160E' },
  privateCopy: { lineHeight: 22, color: '#5A493A' },
  messageCard: { padding: 20, borderRadius: 18, backgroundColor: '#F7F1E7' },
  message: { color: '#5A493A' },
});
