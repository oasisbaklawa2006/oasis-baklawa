import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { ProductImage } from "@/components/ProductImage";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCatalogue, type CatalogueProduct } from "@/lib/api/catalogue";
import { addCustomerOrderDraftLine } from "@/lib/api/draft";
import { nextValidQuantity } from "@/lib/draft-utils";
import { clearQuoteRequestIdempotencyKey, getQuoteRequestIdempotencyKey } from "@/lib/quote-idempotency";
import { isQuoteRequestEnabled } from "@/lib/quote-guards";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import { useNetwork } from "@/context/NetworkContext";
import { useCustomerFavourites } from "@/hooks/useCustomerFavourites";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetail">;

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { isApprovedBuyer } = useBuyerSession();
  const { isOnline } = useNetwork();
  const { isFavourite, toggleFavourite } = useCustomerFavourites();
  const [product, setProduct] = useState<CatalogueProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [requestingQuote, setRequestingQuote] = useState(false);
  const [requestKey, setRequestKey] = useState<string | null>(null);
  const [favouriteBusy, setFavouriteBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalogue = await fetchCatalogue({ includeBuyerPrices: isApprovedBuyer });
      const match = catalogue.find((p) => p.product_id === productId) ?? null;
      setProduct(match);
      if (match) {
        setQuantity(match.price?.minimum_order_quantity ?? 1);
      }
      if (!match) setError("Product not found in the published catalogue.");
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, [productId, isApprovedBuyer]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isApprovedBuyer) return;
    void getQuoteRequestIdempotencyKey().then(setRequestKey);
  }, [isApprovedBuyer]);

  const moq = product?.price?.minimum_order_quantity ?? 1;
  const increment = product?.price?.order_increment ?? 1;

  const priceLabel = useMemo(() => {
    if (!product?.price) return null;
    return formatMoney(product.price.selling_price, product.price.currency);
  }, [product]);

  async function requestQuotation() {
    if (!product?.price || !requestKey) return;
    setRequestingQuote(true);
    setNotice(null);
    try {
      const result = await customerGateway.submitQuotationRequest({
        idempotencyKey: requestKey,
        lines: [{ product_id: product.product_id, quantity }],
      });
      if (!result.already_applied) {
        await clearQuoteRequestIdempotencyKey();
        setRequestKey(await getQuoteRequestIdempotencyKey());
      }
      navigation.navigate("QuotationDetail", {
        quotationId: result.quotation_id,
        quotationNumber: result.quotation_number,
      });
    } catch (e) {
      setNotice(parseRpcError(e).message);
    } finally {
      setRequestingQuote(false);
    }
  }

  const quoteRequestEnabled = isQuoteRequestEnabled({
    lineCount: product?.price ? 1 : 0,
    submitting: requestingQuote,
    keyReady: Boolean(requestKey),
    idempotencyKey: requestKey,
    keyPersisted: Boolean(requestKey),
    isOnline,
  });

  async function addToCart() {
    if (!product?.price) return;
    setAdding(true);
    setNotice(null);
    try {
      await addCustomerOrderDraftLine(product.product_id, quantity);
      setNotice("Added to your draft cart.");
    } catch (e) {
      setNotice(parseRpcError(e).message);
    } finally {
      setAdding(false);
    }
  }

  async function onToggleFavourite() {
    setFavouriteBusy(true);
    setNotice(null);
    try {
      await toggleFavourite(productId, !isFavourite(productId));
    } catch (e) {
      setNotice(parseRpcError(e).message);
    } finally {
      setFavouriteBusy(false);
    }
  }

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Product" subtitle={product?.sku ?? ""}>
        {loading ? (
          <LoadingState message="Loading product…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : product ? (
          <ScrollView contentContainerStyle={styles.content}>
            <ProductImage uri={product.hero_image_url} style={styles.hero} accessibilityLabel={product.product_name} />
            {isApprovedBuyer ? (
              <TouchableOpacity
                style={styles.favouriteButton}
                disabled={favouriteBusy}
                onPress={() => void onToggleFavourite()}
                accessibilityRole="button"
                accessibilityState={{ selected: isFavourite(productId) }}
              >
                <Text style={[styles.favouriteIcon, isFavourite(productId) && styles.favouriteIconActive]}>
                  {isFavourite(productId) ? "Saved to favourites" : "Save to favourites"}
                </Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.name}>{product.product_name}</Text>
            <Text style={styles.meta}>{[product.category, product.subcategory].filter(Boolean).join(" · ")}</Text>
            {priceLabel ? (
              <Text style={styles.price}>
                {priceLabel} / {product.price?.uom}
              </Text>
            ) : (
              <Text style={styles.unavailable}>Buyer pricing unavailable</Text>
            )}
            {product.short_description ? <Text style={styles.description}>{product.short_description}</Text> : null}
            {product.long_description ? <Text style={styles.description}>{product.long_description}</Text> : null}
            {product.pack_size ? <Text style={styles.fact}>Pack: {product.pack_size}</Text> : null}
            {product.shelf_life ? <Text style={styles.fact}>Shelf life: {product.shelf_life}</Text> : null}
            {product.dietary_tags?.length ? (
              <Text style={styles.fact}>Tags: {product.dietary_tags.join(", ")}</Text>
            ) : null}

            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setQuantity((q) => nextValidQuantity(q, moq, increment, -1))}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{quantity}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setQuantity((q) => nextValidQuantity(q, moq, increment, 1))}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.moq}>MOQ {moq}</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, (!product.price || adding) && styles.buttonDisabled]}
              disabled={!product.price || adding}
              onPress={addToCart}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{adding ? "Adding…" : "Add to cart"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, !quoteRequestEnabled && styles.buttonDisabled]}
              disabled={!quoteRequestEnabled}
              onPress={() => void requestQuotation()}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>{requestingQuote ? "Requesting…" : "Request quotation"}</Text>
            </TouchableOpacity>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate("Cart")}>
              <Text style={styles.secondaryText}>View cart</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  hero: { width: "100%", height: 240, marginTop: spacing.md },
  favouriteButton: { alignSelf: "flex-start" },
  favouriteIcon: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textSecondary },
  favouriteIconActive: { color: colors.action },
  name: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeXxl, color: colors.textPrimary },
  meta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  price: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeLg, color: colors.action },
  unavailable: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, color: colors.textMuted },
  description: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, lineHeight: 22, color: colors.textSecondary },
  fact: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surfacePremium,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { fontSize: 20, color: colors.action, fontWeight: "700" },
  qty: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeLg, minWidth: 40, textAlign: "center" },
  moq: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted },
  button: {
    backgroundColor: colors.action,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.action,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryButtonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.action },
  notice: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, textAlign: "center" },
  secondary: { paddingVertical: spacing.md, alignItems: "center" },
  secondaryText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.action },
});
