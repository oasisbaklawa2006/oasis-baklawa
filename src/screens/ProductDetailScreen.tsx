import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { ProductImage } from "@/components/ProductImage";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCatalogue, type CatalogueProduct } from "@/lib/api/catalogue";
import { addCustomerOrderDraftLine, getCustomerOrderDraft } from "@/lib/api/draft";
import { defaultOrderQuantity, resolveCommercialRules, validateOrderQuantity } from "@/lib/buyer-commercial-validation";
import { findDraftLineQuantity, nextValidQuantity } from "@/lib/draft-utils";
import { clearQuoteRequestIdempotencyKey, getQuoteRequestIdempotencyKey, type ResolvedQuoteIdempotency } from "@/lib/quote-idempotency";
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
  const [requestKey, setRequestKey] = useState<ResolvedQuoteIdempotency | null>(null);
  const [favouriteBusy, setFavouriteBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [existingCartQuantity, setExistingCartQuantity] = useState<number | null>(null);
  const loadGenerationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError(null);
    try {
      const catalogue = await fetchCatalogue({ includeBuyerPrices: isApprovedBuyer });
      const match = catalogue.find((p) => p.product_id === productId) ?? null;
      if (generation !== loadGenerationRef.current) return;

      let inCartQuantity: number | null = null;
      if (match && isApprovedBuyer) {
        // Without this, quantity always resets to the MOQ default, and
        // add_customer_order_draft_line_v1's ON CONFLICT DO UPDATE SET
        // quantity = excluded.quantity REPLACES (not adds to) the existing
        // line -- so tapping "Add to cart" again with a different quantity
        // than what's already in the draft silently overwrites, not
        // increments, the cart total for this product. Pre-filling the
        // stepper with what's already there, and labelling the action
        // "Update cart" in that case, makes the RPC's actual replace
        // semantics match what the screen shows and what the button says.
        try {
          const draft = await getCustomerOrderDraft();
          inCartQuantity = findDraftLineQuantity(draft, productId);
        } catch {
          // Non-fatal: worst case the stepper falls back to the MOQ default
          // below, same as before this fix.
        }
      }

      if (generation !== loadGenerationRef.current) return;
      setProduct(match);
      setExistingCartQuantity(inCartQuantity);
      if (inCartQuantity !== null) {
        setQuantity(inCartQuantity);
      } else if (match) {
        const moq = defaultOrderQuantity(match.price);
        if (moq !== null) {
          setQuantity(moq);
        }
      }
      if (!match) setError("Product not found in the published catalogue.");
    } catch (e) {
      if (generation === loadGenerationRef.current) {
        setError(parseRpcError(e).message);
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [productId, isApprovedBuyer]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isApprovedBuyer) return;
    void getQuoteRequestIdempotencyKey().then(setRequestKey);
  }, [isApprovedBuyer]);

  const commercial = resolveCommercialRules(product?.price);
  const moq = commercial.rules?.moq ?? 0;
  const increment = commercial.rules?.increment ?? 0;
  const canOrder = commercial.orderable && moq > 0 && increment > 0;

  const priceLabel = useMemo(() => {
    if (!product?.price) return null;
    return formatMoney(product.price.selling_price, product.price.currency);
  }, [product]);

  async function requestQuotation() {
    if (!product?.price || !requestKey?.key || !requestKey.persisted || !canOrder) return;
    const quantityCheck = validateOrderQuantity(product.price, quantity);
    if (!quantityCheck.orderable) {
      setNotice(quantityCheck.message ?? "Quantity does not satisfy MOQ or carton rules.");
      return;
    }
    setRequestingQuote(true);
    setNotice(null);
    try {
      const result = await customerGateway.submitQuotationRequest({
        idempotencyKey: requestKey.key,
        lines: [{ product_id: product.product_id, quantity }],
      });
      await clearQuoteRequestIdempotencyKey();
      setRequestKey(await getQuoteRequestIdempotencyKey());
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

  const quantityCheck = validateOrderQuantity(product?.price, quantity);
  const quoteRequestEnabled = isQuoteRequestEnabled({
    lineCount: canOrder && quantityCheck.orderable ? 1 : 0,
    submitting: requestingQuote,
    keyReady: Boolean(requestKey?.key),
    idempotencyKey: requestKey?.key ?? null,
    keyPersisted: requestKey?.persisted ?? false,
    isOnline,
  });

  async function addToCart() {
    if (!product?.price || !canOrder) return;
    const quantityCheck = validateOrderQuantity(product.price, quantity);
    if (!quantityCheck.orderable) {
      setNotice(quantityCheck.message ?? "Quantity does not satisfy MOQ or carton rules.");
      return;
    }
    setAdding(true);
    setNotice(null);
    try {
      await addCustomerOrderDraftLine(product.product_id, quantity);
      setExistingCartQuantity(quantity);
      setNotice(existingCartQuantity !== null ? "Updated your draft cart." : "Added to your draft cart.");
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
    <BuyerGate
      onLogin={() => navigation.navigate("Login")}
      onRegister={() => navigation.navigate("Register")}
      requireApprovedBuyer={false}
    >
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
              <View>
                <Text style={styles.unavailable}>{commercial.message ?? "Buyer pricing unavailable"}</Text>
                {!isApprovedBuyer ? (
                  <TouchableOpacity onPress={() => navigation.navigate("Login")} accessibilityRole="button">
                    <Text style={styles.loginPrompt}>Log in as an approved buyer to see pricing</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            {product.short_description ? <Text style={styles.description}>{product.short_description}</Text> : null}
            {product.long_description ? <Text style={styles.description}>{product.long_description}</Text> : null}
            {product.pack_size ? <Text style={styles.fact}>Pack: {product.pack_size}</Text> : null}
            {product.shelf_life ? <Text style={styles.fact}>Shelf life: {product.shelf_life}</Text> : null}
            {product.dietary_tags?.length ? (
              <Text style={styles.fact}>Tags: {product.dietary_tags.join(", ")}</Text>
            ) : null}

            {canOrder ? (
            <>
              {existingCartQuantity !== null ? (
                <Text style={styles.inCartNote}>Already in your cart: {existingCartQuantity}</Text>
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
            </>
            ) : null}

            <TouchableOpacity
              style={[styles.button, (!canOrder || adding) && styles.buttonDisabled]}
              disabled={!canOrder || adding}
              onPress={addToCart}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>
                {adding ? "Saving…" : existingCartQuantity !== null ? "Update cart" : "Add to cart"}
              </Text>
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
  loginPrompt: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeSm,
    color: colors.action,
    marginTop: 4,
  },
  description: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, lineHeight: 22, color: colors.textSecondary },
  fact: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  inCartNote: {
    fontFamily: typography.fontFamilySansMedium,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
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
