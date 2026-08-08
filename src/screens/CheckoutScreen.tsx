import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { calculateCustomerAdvance, submitCustomerOrder } from "@/lib/api/checkout";
import { getCustomerOrderDraft } from "@/lib/api/draft";
import { clearCheckoutIdempotencyKey, resolveCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import { formatAdvanceDisplay, isCheckoutSubmitEnabled, type AdvanceLoadState } from "@/lib/checkout-submit-guards";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerOrderDraft } from "@/types/database.types";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

export function CheckoutScreen({ navigation }: Props) {
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
  });

  async function submitOrder() {
    if (!canSubmit || !idempotencyKey || !draft?.draft_id) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await submitCustomerOrder(idempotencyKey);
      await clearCheckoutIdempotencyKey(draft.draft_id);
      navigation.replace("Orders", {
        checkoutSuccess: {
          orderNumber: result.order_number,
          salesOrderValue: Number(result.sales_order_value),
          advanceRequired: Number(result.advance_required),
          isDuplicateSubmission: result.is_duplicate_submission,
        },
      });
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
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
          <ActivityIndicator color="#7A1B2B" style={styles.loader} />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Row label="Order value (SO)" value={`₹${orderValue.toLocaleString("en-IN")}`} />
              <Row label="Advance due" value={advanceDisplay} emphasis />
              <Row label="Balance on dispatch" value={`₹${balance.toLocaleString("en-IN")}`} />
            </View>

            {!draft?.is_checkout_ready ? (
              <Text style={styles.warning}>
                Your cart is not checkout-ready. Return to the cart and fix MOQ/carton issues.
              </Text>
            ) : null}

            {advanceState.status === "failed" ? (
              <Text style={styles.warning}>{advanceState.message}</Text>
            ) : null}

            {persistenceError ? (
              <View style={styles.persistenceBlock}>
                <Text style={styles.warning}>{persistenceError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadCheckout}>
                  <Text style={styles.retryButtonText}>Retry saving checkout attempt</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.note}>Payment capture is not enabled in this release. Submitting creates your Sales Order.</Text>

            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              disabled={!canSubmit}
              onPress={submitOrder}
            >
              <Text style={styles.buttonText}>
                {submitting ? "Submitting order…" : `Submit Sales Order · Advance ${submitLabelAdvance}`}
              </Text>
            </TouchableOpacity>
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
  summaryCard: { backgroundColor: "#F0DED0", borderRadius: 12, padding: 16, marginTop: 16, gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { fontSize: 13, color: "#5A4438", flex: 1 },
  rowValue: { fontSize: 13, fontWeight: "700", color: "#3A2A22" },
  rowValueEmphasis: { color: "#7A1B2B", fontSize: 15 },
  warning: { marginTop: 16, fontSize: 13, color: "#B26A00" },
  persistenceBlock: { marginTop: 12, gap: 8 },
  retryButton: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#F0DED0" },
  retryButtonText: { color: "#7A1B2B", fontWeight: "700", fontSize: 12 },
  note: { marginTop: 20, fontSize: 12, color: "#8A6B5C", lineHeight: 18 },
  button: { backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 20 },
  buttonDisabled: { backgroundColor: "#B0A296" },
  buttonText: { color: "#FFF", fontWeight: "700", textAlign: "center" },
  error: { color: "#B3261E", marginTop: 12 },
  loader: { marginTop: 24 },
});
