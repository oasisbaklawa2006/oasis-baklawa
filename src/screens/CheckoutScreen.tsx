import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useNetwork } from "@/context/NetworkContext";
import { getAuthoritativeCheckoutQuote, submitQuotedCustomerOrder, type AuthoritativeCheckoutQuote } from "@/lib/api/checkout";
import { getCustomerOrderDraft } from "@/lib/api/draft";
import { fetchBuyerProductPrices } from "@/lib/api/catalogue";
import { validateDraftLinesAgainstPrices } from "@/lib/buyer-commercial-validation";
import { clearCheckoutIdempotencyKey, resolveCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import { isCheckoutSubmitEnabled, type AdvanceLoadState } from "@/lib/checkout-submit-guards";
import { parseRpcError } from "@/lib/rpc-errors";
import { classifyCheckoutSubmitError } from "@/lib/checkout-submit-error";
import type { BuyerProductPrice, CustomerOrderDraft } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

export function CheckoutScreen({ navigation }: Props) {
  const { isOnline } = useNetwork();
  const submitInFlightRef = useRef(false);
  const [draft, setDraft] = useState<CustomerOrderDraft | null>(null);
  const [pricesByProduct, setPricesByProduct] = useState<Record<string, BuyerProductPrice>>({});
  const [advanceState, setAdvanceState] = useState<AdvanceLoadState>({ status: "loading" });
  const [quote, setQuote] = useState<AuthoritativeCheckoutQuote | null>(null);
  const [approvedFingerprint, setApprovedFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftAlreadySubmittedElsewhere, setDraftAlreadySubmittedElsewhere] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [keyPersisted, setKeyPersisted] = useState(false);
  const [keyReady, setKeyReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const loadCheckout = useCallback(async () => {
    setLoading(true);
    setKeyReady(false);
    setError(null);
    setDraftAlreadySubmittedElsewhere(false);
    setPersistenceError(null);
    setAdvanceState({ status: "loading" });
    setQuote(null);
    setApprovedFingerprint(null);

    try {
      const [draftData, prices] = await Promise.all([getCustomerOrderDraft(), fetchBuyerProductPrices()]);
      setDraft(draftData);
      setPricesByProduct(Object.fromEntries(prices.map((price) => [price.product_id, price])));

      if (!draftData?.draft_id) {
        setIdempotencyKey(null);
        setKeyPersisted(false);
        setAdvanceState({ status: "resolved", amount: 0 });
        return;
      }

      const resolved = await resolveCheckoutIdempotencyKey(draftData.draft_id);
      setIdempotencyKey(resolved.key);
      setKeyPersisted(resolved.persisted);

      if (!resolved.persisted) {
        setPersistenceError(
          "Could not save your checkout attempt locally. Order submission is blocked until persistence succeeds."
        );
        setAdvanceState({ status: "failed", message: "Advance unavailable until checkout attempt is saved." });
        return;
      }

      try {
        const serverQuote = await getAuthoritativeCheckoutQuote();
        if (serverQuote.draft_id !== draftData.draft_id) {
          throw new Error("QUOTE_CHANGED_REFRESH_REQUIRED: cart changed; refresh checkout");
        }
        setQuote(serverQuote);
        setAdvanceState({ status: "resolved", amount: serverQuote.advance_required });
      } catch (quoteError) {
        setQuote(null);
        setAdvanceState({
          status: "failed",
          message: parseRpcError(quoteError).message,
        });
      }
    } catch (e) {
      setError(parseRpcError(e).message);
      setAdvanceState({ status: "failed", message: parseRpcError(e).message });
    } finally {
      setLoading(false);
      setKeyReady(true);
    }
  }, []);

  useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  const orderValue = draft?.order_total ?? 0;

  const commercialValidation = useMemo(() => {
    if (!draft?.lines.length) {
      return { orderable: false, message: "Cart is empty." };
    }
    return validateDraftLinesAgainstPrices(draft.lines, pricesByProduct);
  }, [draft, pricesByProduct]);

  const canSubmit = isCheckoutSubmitEnabled({
    checkoutReady: draft?.is_checkout_ready ?? false,
    // The existing draft RPC is pre-tax and cannot attest buyer approval of the final SO.
    // Do not enable submission until a server quote with atomic submit binding exists.
    authoritativeQuoteApproved: Boolean(quote && approvedFingerprint === quote.fingerprint),
    orderValue: quote?.sales_order_value ?? 0,
    submitting,
    keyReady,
    idempotencyKey,
    keyPersisted,
    advanceState,
    commercialValidationPassed: commercialValidation.orderable,
    isOnline,
  });

  async function submitOrder() {
    if (!canSubmit || !idempotencyKey || !draft?.draft_id || !quote || !approvedFingerprint || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    setDraftAlreadySubmittedElsewhere(false);
    try {
      const result = await submitQuotedCustomerOrder(idempotencyKey, approvedFingerprint);
      try {
        await clearCheckoutIdempotencyKey(draft.draft_id);
      } catch {
        // Best-effort cleanup; server deduplicates repeated keys.
      }
      navigation.replace("OrderConfirmation", { orderId: result.order_id });
    } catch (e) {
      const presentation = classifyCheckoutSubmitError(parseRpcError(e));
      setDraftAlreadySubmittedElsewhere(presentation.concurrentPromotion);
      setError(presentation.message);
      setApprovedFingerprint(null);
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Checkout" subtitle="Review and approve the final GST-inclusive quotation" safeAreaEdges={["top", "bottom"]}>
        {loading ? (
          <LoadingState message="Preparing checkout…" />
        ) : error && !draft ? (
          <ErrorState message={error} onRetry={loadCheckout} />
        ) : !draft?.draft_id || (draft.lines.length === 0 && orderValue === 0) ? (
          <EmptyState
            title="Nothing to checkout"
            message="Your server draft is empty. Add products from the catalogue or Oasis Genie first."
            actionLabel="Open cart"
            onAction={() => navigation.navigate("Cart")}
          />
        ) : (
          <>
            {!isOnline ? (
              <Text style={styles.offline} accessibilityRole="alert">
                You are offline. Order submission is disabled until your connection returns.
              </Text>
            ) : null}

            <View style={styles.summaryCard}>
              <Row label="Draft subtotal before tax" value={`₹${orderValue.toLocaleString("en-IN")}`} />
              <Row label="GST-inclusive Sales Order total" value={quote ? `₹${quote.sales_order_value.toLocaleString("en-IN")}` : "Awaiting Core quote"} />
              <Row label="Advance payable" value={quote ? `₹${quote.advance_required.toLocaleString("en-IN")}` : "Awaiting Core quote"} emphasis />
              <Row label="Remaining balance" value={quote ? `₹${(quote.sales_order_value - quote.advance_required).toLocaleString("en-IN")}` : "Awaiting Core quote"} />
            </View>

            {!draft?.is_checkout_ready ? (
              <Text style={styles.warning} accessibilityRole="alert">
                Your cart is not checkout-ready. Return to the cart and fix MOQ/carton issues.
              </Text>
            ) : null}

            {!commercialValidation.orderable ? (
              <Text style={styles.warning} accessibilityRole="alert">
                {commercialValidation.message ??
                  "Current pricing rules are unavailable. Return to the cart and refresh before checkout."}
              </Text>
            ) : null}

            {advanceState.status === "failed" ? (
              <Text style={styles.warning} accessibilityRole="alert">
                {advanceState.message}
              </Text>
            ) : null}

            {persistenceError ? (
              <View style={styles.persistenceBlock}>
                <Text style={styles.warning} accessibilityRole="alert">
                  {persistenceError}
                </Text>
                <OasisButton label="Retry saving checkout attempt" onPress={loadCheckout} variant="secondary" />
              </View>
            ) : null}

            {error ? (
              <View>
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
                {draftAlreadySubmittedElsewhere ? (
                  <OasisButton
                    label="View Orders"
                    variant="secondary"
                    onPress={() => navigation.navigate("MainTabs", { screen: "Orders" })}
                  />
                ) : null}
              </View>
            ) : null}

            {quote ? (
              <View style={styles.persistenceBlock}>
                <Text style={styles.note}>
                  Confirm the GST-inclusive Sales Order value and required advance above. Approval applies only to this exact server quotation; any change requires a fresh quotation.
                </Text>
                <OasisButton
                  label={approvedFingerprint === quote.fingerprint ? "Quotation approved" : "Approve final quotation"}
                  variant="secondary"
                  disabled={!isOnline || !commercialValidation.orderable || !draft?.is_checkout_ready || approvedFingerprint === quote.fingerprint}
                  onPress={() => setApprovedFingerprint(quote.fingerprint)}
                />
                <OasisButton label="Refresh quotation" variant="secondary" onPress={loadCheckout} disabled={submitting} />
              </View>
            ) : (
              <Text style={styles.warning} accessibilityRole="alert">
                Final quotation is unavailable. Order submission remains blocked. Refresh after Core quote service is ready.
              </Text>
            )}
            <Text style={styles.note}>
              A Sales Order is created only after you approve the final quotation and submit. Payment is a separate step.
            </Text>

            <OasisButton
              label={submitting ? "Submitting order…" : "Submit Sales Order"}
              onPress={submitOrder}
              disabled={!canSubmit}
              loading={submitting}
              accessibilityHint="Disabled until a Core GST-inclusive quote is verified and explicitly approved by the buyer"
            />
          </>
        )}
      </Screen>
    </BuyerGate>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surfacePremium,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, flex: 1 },
  rowValue: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  rowValueEmphasis: { color: colors.action, fontSize: typography.sizeLg },
  warning: { marginTop: spacing.md, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.warning },
  offline: { marginTop: spacing.md, fontFamily: typography.fontFamilySansMedium, fontSize: typography.sizeSm, color: colors.warning },
  persistenceBlock: { marginTop: spacing.md, gap: spacing.sm },
  note: { marginTop: spacing.lg, fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, lineHeight: 18 },
  error: { color: colors.error, marginTop: spacing.md, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm },
});
