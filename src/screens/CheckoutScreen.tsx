import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { calculateCustomerAdvance, submitCustomerOrder } from "@/lib/api/checkout";
import { getCustomerOrderDraft } from "@/lib/api/draft";
import { clearCheckoutIdempotencyKey, resolveCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerOrderDraft } from "@/types/database.types";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

export function CheckoutScreen({ navigation }: Props) {
  const [draft, setDraft] = useState<CustomerOrderDraft | null>(null);
  const [advance, setAdvance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [keyReady, setKeyReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setKeyReady(false);
      setError(null);
      setStorageWarning(null);

      try {
        const draftData = await getCustomerOrderDraft();
        if (cancelled) return;

        setDraft(draftData);

        if (!draftData?.draft_id) {
          setIdempotencyKey(null);
          setAdvance(0);
          setKeyReady(true);
          return;
        }

        const resolved = await resolveCheckoutIdempotencyKey(draftData.draft_id);
        if (cancelled) return;

        setIdempotencyKey(resolved.key);
        if (resolved.storageError) {
          setStorageWarning(
            "Could not persist checkout attempt locally. Retrying on this screen may use a new submission key."
          );
        }

        if (draftData.order_total > 0) {
          const advanceAmount = await calculateCustomerAdvance(draftData.order_total);
          if (!cancelled) setAdvance(advanceAmount);
        } else {
          setAdvance(0);
        }
      } catch (e) {
        if (!cancelled) setError(parseRpcError(e).message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setKeyReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const orderValue = draft?.order_total ?? 0;
  const balance = useMemo(() => Math.max(0, orderValue - (advance ?? 0)), [orderValue, advance]);
  const canSubmit =
    draft?.is_checkout_ready && orderValue > 0 && !submitting && keyReady && idempotencyKey != null;

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

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Checkout" subtitle="Authoritative draft totals · Advance due">
        {loading ? (
          <ActivityIndicator color="#7A1B2B" style={styles.loader} />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Row label="Order value (SO)" value={`₹${orderValue.toLocaleString("en-IN")}`} />
              <Row label="Advance due" value={`₹${(advance ?? 0).toLocaleString("en-IN")}`} emphasis />
              <Row label="Balance on dispatch" value={`₹${balance.toLocaleString("en-IN")}`} />
            </View>

            {!draft?.is_checkout_ready ? (
              <Text style={styles.warning}>
                Your cart is not checkout-ready. Return to the cart and fix MOQ/carton issues.
              </Text>
            ) : null}

            {storageWarning ? <Text style={styles.warning}>{storageWarning}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.note}>Payment capture is not enabled in this release. Submitting creates your Sales Order.</Text>

            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              disabled={!canSubmit}
              onPress={submitOrder}
            >
              <Text style={styles.buttonText}>
                {submitting
                  ? "Submitting order…"
                  : `Submit Sales Order · Advance ₹${(advance ?? 0).toLocaleString("en-IN")}`}
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
  note: { marginTop: 20, fontSize: 12, color: "#8A6B5C", lineHeight: 18 },
  button: { backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 20 },
  buttonDisabled: { backgroundColor: "#B0A296" },
  buttonText: { color: "#FFF", fontWeight: "700", textAlign: "center" },
  error: { color: "#B3261E", marginTop: 12 },
  loader: { marginTop: 24 },
});
