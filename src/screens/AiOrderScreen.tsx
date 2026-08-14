import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { supabase } from "@/lib/supabase";
import { colors, spacing, typography, touchTarget } from "@/theme";

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
        <View style={styles.unavailable}>
          <Text style={styles.unavailableText}>Voice ordering is not yet available. The ai-order-parse contract for audio input has not been verified for production.</Text>
        </View>
      )}
      {mode === "image" && (
        <View style={styles.unavailable}>
          <Text style={styles.unavailableText}>PO image capture is not yet available. OCR ordering requires a verified edge function contract.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} disabled={parsing || mode !== "text"} onPress={parseOrder}>
        <Text style={styles.buttonText}>{parsing ? "Parsing…" : mode === "text" ? "Parse Order" : "Text mode only"}</Text>
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
  tabs: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfacePremium,
    alignItems: "center",
    minHeight: touchTarget,
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.action },
  tabText: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXs, color: colors.action, textAlign: "center" },
  tabTextActive: { color: colors.white },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: typography.sizeSm,
    fontFamily: typography.fontFamilySans,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: colors.action,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: spacing.md,
    minHeight: touchTarget,
    justifyContent: "center",
  },
  buttonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.action,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    minHeight: touchTarget,
    justifyContent: "center",
  },
  secondaryButtonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.action },
  error: { color: colors.error, marginTop: spacing.sm, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm },
  unavailable: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md, backgroundColor: colors.surfaceUtility },
  unavailableText: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, lineHeight: 20 },
  reviewRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", marginBottom: 10 },
  reviewInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: typography.fontFamilySans,
    color: colors.textPrimary,
  },
  reviewQty: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: "center",
    fontFamily: typography.fontFamilySans,
    color: colors.textPrimary,
  },
  reviewUom: { width: 40, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  reviewActions: { flexDirection: "row", gap: 10, marginTop: spacing.md },
});
