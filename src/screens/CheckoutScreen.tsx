import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;
type PaymentMethod = "upi" | "netbanking" | "credit_terms";

const ORDER_VALUE = 51_640;
const ADVANCE_PERCENT = 0.2;

export function CheckoutScreen({ navigation }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");

  const advance = useMemo(() => Math.round(ORDER_VALUE * ADVANCE_PERCENT), []);
  const balance = ORDER_VALUE - advance;

  return (
    <Screen title="Checkout" subtitle="Advance token deposit · Payment">
      <View style={styles.summaryCard}>
        <Row label="Order value" value={`₹${ORDER_VALUE.toLocaleString("en-IN")}`} />
        <Row label={`Advance token deposit (${ADVANCE_PERCENT * 100}%)`} value={`₹${advance.toLocaleString("en-IN")}`} emphasis />
        <Row label="Balance on dispatch" value={`₹${balance.toLocaleString("en-IN")}`} />
      </View>

      <Text style={styles.sectionTitle}>Payment Method</Text>
      <View style={styles.methods}>
        {(
          [
            { key: "upi", label: "UPI" },
            { key: "netbanking", label: "Net Banking" },
            { key: "credit_terms", label: "Credit Terms" },
          ] as { key: PaymentMethod; label: string }[]
        ).map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.methodChip, paymentMethod === m.key && styles.methodChipActive]}
            onPress={() => setPaymentMethod(m.key)}
          >
            <Text style={[styles.methodText, paymentMethod === m.key && styles.methodTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Orders")}>
        <Text style={styles.buttonText}>Pay Advance ₹{advance.toLocaleString("en-IN")}</Text>
      </TouchableOpacity>
    </Screen>
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
  rowLabel: { fontSize: 13, color: "#5A4438" },
  rowValue: { fontSize: 13, fontWeight: "700", color: "#3A2A22" },
  rowValueEmphasis: { color: "#7A1B2B", fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#3A2A22", marginTop: 24, marginBottom: 12 },
  methods: { flexDirection: "row", gap: 8 },
  methodChip: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#F0DED0", alignItems: "center" },
  methodChipActive: { backgroundColor: "#7A1B2B" },
  methodText: { fontSize: 12, color: "#7A1B2B", fontWeight: "600" },
  methodTextActive: { color: "#FFF" },
  button: { backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 28 },
  buttonText: { color: "#FFF", fontWeight: "700" },
});
