import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { supabase } from "@/lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "AiOrder">;
type InputMode = "text" | "audio" | "image";

interface ParsedLine {
  productName: string;
  quantity: number;
  uom: string;
}

export function AiOrderScreen({ navigation }: Props) {
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [reviewLines, setReviewLines] = useState<ParsedLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function parseOrder() {
    setParsing(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.functions.invoke("ai-order-parse", {
        body: { mode, text },
      });
      if (rpcError) throw rpcError;
      const lines: ParsedLine[] = data?.lines ?? [];
      setReviewLines(lines);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse order");
    } finally {
      setParsing(false);
    }
  }

  function updateLine(index: number, patch: Partial<ParsedLine>) {
    setReviewLines((prev) => (prev ? prev.map((l, i) => (i === index ? { ...l, ...patch } : l)) : prev));
  }

  function confirmOrder() {
    setReviewLines(null);
    navigation.navigate("Cart");
  }

  return (
    <Screen title="AI Order" subtitle="Text, voice or PO image → order draft">
      <View style={styles.tabs}>
        {(["text", "audio", "image"] as InputMode[]).map((m) => (
          <TouchableOpacity key={m} style={[styles.tab, mode === m && styles.tabActive]} onPress={() => setMode(m)}>
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === "text" ? "Type Order" : m === "audio" ? "Voice Note" : "PO Image (OCR)"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "text" && (
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="e.g. 20kg Kaju Katli, 10 boxes Almond Baklawa"
          value={text}
          onChangeText={setText}
        />
      )}
      {mode === "audio" && (
        <TouchableOpacity style={styles.recordButton}>
          <Text style={styles.recordButtonText}>🎙 Tap to record order</Text>
        </TouchableOpacity>
      )}
      {mode === "image" && (
        <TouchableOpacity style={styles.recordButton}>
          <Text style={styles.recordButtonText}>📷 Capture or upload PO image</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.button} disabled={parsing} onPress={parseOrder}>
        <Text style={styles.buttonText}>{parsing ? "Parsing…" : "Parse Order"}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={!!reviewLines} animationType="slide" onRequestClose={() => setReviewLines(null)}>
        <Screen title="Review Parsed Order" subtitle="Confirm quantities before adding to cart">
          {(reviewLines ?? []).map((line, index) => (
            <View key={`${line.productName}-${index}`} style={styles.reviewRow}>
              <TextInput
                style={styles.reviewInput}
                value={line.productName}
                onChangeText={(v) => updateLine(index, { productName: v })}
              />
              <TextInput
                style={styles.reviewQty}
                keyboardType="numeric"
                value={String(line.quantity)}
                onChangeText={(v) => updateLine(index, { quantity: Number(v) || 0 })}
              />
              <Text style={styles.reviewUom}>{line.uom}</Text>
            </View>
          ))}
          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setReviewLines(null)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={confirmOrder}>
              <Text style={styles.buttonText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#F0DED0", alignItems: "center" },
  tabActive: { backgroundColor: "#7A1B2B" },
  tabText: { fontSize: 11, color: "#7A1B2B", fontWeight: "600", textAlign: "center" },
  tabTextActive: { color: "#FFF" },
  textArea: { borderWidth: 1, borderColor: "#E0C9B8", borderRadius: 10, padding: 14, minHeight: 120, textAlignVertical: "top", fontSize: 14 },
  recordButton: { borderWidth: 1, borderStyle: "dashed", borderColor: "#7A1B2B", borderRadius: 10, paddingVertical: 40, alignItems: "center" },
  recordButtonText: { color: "#7A1B2B", fontWeight: "600" },
  button: { backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#FFF", fontWeight: "600" },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  secondaryButtonText: { color: "#7A1B2B", fontWeight: "600" },
  error: { color: "#B3261E", marginTop: 8 },
  reviewRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 10 },
  reviewInput: { flex: 2, borderWidth: 1, borderColor: "#E0C9B8", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  reviewQty: { flex: 1, borderWidth: 1, borderColor: "#E0C9B8", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, textAlign: "center" },
  reviewUom: { width: 40, fontSize: 12, color: "#8A6B5C" },
  reviewActions: { flexDirection: "row", gap: 10, marginTop: 12 },
});
