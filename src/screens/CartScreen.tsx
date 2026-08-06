import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "Cart">;

interface CartLine {
  id: string;
  productName: string;
  triad: "Sweets" | "Namkeen" | "Dry Fruits";
  quantity: number;
  cartonSize: number;
  unitPrice: number;
}

const SAMPLE_LINES: CartLine[] = [
  { id: "1", productName: "Kaju Katli 1kg", triad: "Sweets", quantity: 18, cartonSize: 20, unitPrice: 620 },
  { id: "2", productName: "Almond Baklawa Box", triad: "Sweets", quantity: 24, cartonSize: 24, unitPrice: 480 },
  { id: "3", productName: "Masala Mathri 500g", triad: "Namkeen", quantity: 10, cartonSize: 12, unitPrice: 140 },
  { id: "4", productName: "Premium Mixed Dry Fruits", triad: "Dry Fruits", quantity: 6, cartonSize: 10, unitPrice: 950 },
];

export function CartScreen({ navigation }: Props) {
  const [lines] = useState<CartLine[]>(SAMPLE_LINES);

  const grouped = useMemo(() => {
    const groups: Record<CartLine["triad"], CartLine[]> = { Sweets: [], Namkeen: [], "Dry Fruits": [] };
    lines.forEach((line) => groups[line.triad].push(line));
    return groups;
  }, [lines]);

  const total = useMemo(() => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0), [lines]);

  return (
    <Screen title="Cart" subtitle="Triad split · Carton fill · Smart Fill">
      {(Object.keys(grouped) as CartLine["triad"][]).map((triad) => {
        const triadLines = grouped[triad];
        if (triadLines.length === 0) return null;
        return (
          <View key={triad} style={styles.triadSection}>
            <Text style={styles.triadTitle}>{triad}</Text>
            <FlatList
              data={triadLines}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const cartonFillShort = item.quantity % item.cartonSize !== 0;
                const suggestedFill = Math.ceil(item.quantity / item.cartonSize) * item.cartonSize;
                return (
                  <View style={styles.line}>
                    <View style={styles.lineInfo}>
                      <Text style={styles.lineTitle}>{item.productName}</Text>
                      <Text style={styles.lineMeta}>
                        Qty {item.quantity} · ₹{item.unitPrice}/unit
                      </Text>
                      {cartonFillShort && (
                        <View style={styles.warning}>
                          <Text style={styles.warningText}>
                            ⚠ {item.cartonSize - (item.quantity % item.cartonSize)} short of a full carton
                          </Text>
                          <TouchableOpacity>
                            <Text style={styles.smartFill}>Smart Fill to {suggestedFill}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <Text style={styles.lineTotal}>₹{(item.quantity * item.unitPrice).toLocaleString("en-IN")}</Text>
                  </View>
                );
              }}
            />
          </View>
        );
      })}

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Order Total</Text>
        <Text style={styles.summaryValue}>₹{total.toLocaleString("en-IN")}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Checkout")}>
        <Text style={styles.buttonText}>Proceed to Checkout</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  triadSection: { marginTop: 16 },
  triadTitle: { fontSize: 14, fontWeight: "700", color: "#7A1B2B", marginBottom: 8 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0DED0" },
  lineInfo: { flex: 1 },
  lineTitle: { fontSize: 13, fontWeight: "600", color: "#3A2A22" },
  lineMeta: { fontSize: 11, color: "#8A6B5C", marginTop: 2 },
  warning: { marginTop: 4 },
  warningText: { fontSize: 11, color: "#B26A00" },
  smartFill: { fontSize: 11, color: "#7A1B2B", fontWeight: "700", marginTop: 2 },
  lineTotal: { fontSize: 13, fontWeight: "700", color: "#3A2A22" },
  summary: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E0C9B8" },
  summaryLabel: { fontSize: 15, fontWeight: "700", color: "#3A2A22" },
  summaryValue: { fontSize: 17, fontWeight: "800", color: "#7A1B2B" },
  button: { backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#FFF", fontWeight: "700" },
});
