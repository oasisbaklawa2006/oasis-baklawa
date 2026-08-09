import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useNetwork } from "@/context/NetworkContext";
import { calculateCustomerAdvance, submitCustomerOrder } from "@/lib/api/checkout";
import { getCustomerOrderDraft } from "@/lib/api/draft";
import { clearCheckoutIdempotencyKey, resolveCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import { formatAdvanceDisplay, isCheckoutSubmitEnabled, type AdvanceLoadState } from "@/lib/checkout-submit-guards";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerOrderDraft } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

export function CheckoutScreen({ navigation }: Props) {
  const { isOnline } = useNetwork();
  const submitInFlightRef = useRef(false);
  const [draft, setDraft] = useState<CustomerOrderDraft | null>(null);
  const [advanceState, setAdvanceState] = useState<AdvanceLoadState>({ status: "loading" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [keyPersisted, setKeyPersisted] = useState(false);
  const [keyReady, setKeyReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const loadCheckout = useCallback(async () => {
    setLoading(true);
    setKeyReady(false);
    setError(null);
    setPersistenceError(null);
    setAdvanceState({ status: "loading" });

    try {
      const draftData = await getCustomerOrderDraft();
      setDraft(draftData);

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
        const advanceAmount = await calculateCustomerAdvance(draftData.order_total);
        setAdvanceState({ status: "resolved", amount: advanceAmount });
      } catch (advanceError) {
        setAdvanceState({
          status: "failed",
          message: parseRpcError(advanceError).message,
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
  const advanceDisplay = formatAdvanceDisplay(advanceState);
  const resolvedAdvance = advanceState.status === "resolved" ? advanceState.amount : 0;
  const balance = useMemo(() => Math.max(0, orderValue - resolvedAdvance), [orderValue, resolvedAdvance]);

  const canSubmit = isCheckoutSubmitEnabled({
    checkoutReady: draft?.is_checkout_ready ?? false,
    orderValue,
    submitting,
    keyReady,
    idempotencyKey,
    keyPersisted,
    advanceState,
    isOnline,
  });

  async function submitOrder() {
    if (!canSubmit || !idempotencyKey || !draft?.draft_id || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitCustomerOrder(idempotencyKey);
      await clearCheckoutIdempotencyKey(draft.draft_id);
      navigation.replace("MainTabs", {
        screen: "Orders",
        params: {
          checkoutSuccess: {
            orderNumber: result.order_number,
            salesOrderValue: Number(result.sales_order_value),
            advanceRequired: Number(result.advance_required),
            isDuplicateSubmission: result.is_duplicate_submission,
          },
        },
      });
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  const submitLabelAdvance =
    advanceState.status === "resolved"
      ? `₹${advanceState.amount.toLocaleString("en-IN")}`
      : advanceState.status === "loading"
        ? "…"
        : "Unavailable";

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Checkout" subtitle="Authoritative draft totals · Advance due">
        {loading ? (
          <LoadingState message="Preparing checkout…" />
        ) : error && !draft ? (
          <ErrorState message={error} onRetry={loadCheckout} />
        ) : (
          <>
            {!isOnline ? (
              <Text style={styles.offline} accessibilityRole="alert">
                You are offline. Order submission is disabled until your connection returns.
              </Text>
            ) : null}

            <View style={styles.summaryCard}>
              <Row label="Order value (SO)" value={`₹${orderValue.toLocaleString("en-IN")}`} />
              <Row label="Advance due" value={advanceDisplay} emphasis />
              <Row label="Balance on dispatch" value={`₹${balance.toLocaleString("en-IN")}`} />
            </View>

            {!draft?.is_checkout_ready ? (
              <Text style={styles.warning} accessibilityRole="alert">
                Your cart is not checkout-ready. Return to the cart and fix MOQ/carton issues.
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
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <Text style={styles.note}>
              Payment capture is not enabled in this release. Submitting creates your Sales Order only after the server confirms success.
            </Text>

            <OasisButton
              label={
                submitting
                  ? "Submitting order…"
                  : `Submit Sales Order · Advance ${submitLabelAdvance}`
              }
              onPress={submitOrder}
              disabled={!canSubmit}
              loading={submitting}
              accessibilityHint="Creates a governed Sales Order using your saved idempotency key"
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
