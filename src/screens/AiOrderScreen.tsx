import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCatalogue, type CatalogueProduct } from "@/lib/api/catalogue";
import { addCustomerOrderDraftLine } from "@/lib/api/draft";
import {
  clearGenieDraftLineCommit,
  clearGenieDraftLineCommits,
  isGenieDraftLineCommitted,
  markGenieDraftLineCommitted,
} from "@/lib/genie-draft-line-commit";
import { parseGenieIntake } from "@/lib/genie-intake";
import { createIdempotencyKey } from "@/lib/idempotency";
import {
  applyGenieCandidateSelection,
  resolveGenieLines,
  type GenieAmbiguousLine,
  type GenieParsedLine,
  type GenieResolvedLine,
  type GenieUnresolvedLine,
} from "@/lib/genie-product-resolution";
import { parseRpcError } from "@/lib/rpc-errors";
import { colors, spacing, typography, touchTarget } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "AiOrder">;
type InputMode = "text" | "audio" | "image" | "document";

interface ParsedLine {
  productName: string;
  quantity: number;
  uom: string;
}

export function AiOrderScreen({ navigation }: Props) {
  const { isApprovedBuyer } = useBuyerSession();
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [reviewLines, setReviewLines] = useState<ParsedLine[] | null>(null);
  const [resolvedLines, setResolvedLines] = useState<GenieResolvedLine[]>([]);
  const [ambiguousLines, setAmbiguousLines] = useState<GenieAmbiguousLine[]>([]);
  const [unresolvedLines, setUnresolvedLines] = useState<GenieUnresolvedLine[]>([]);
  const [clarifyingLine, setClarifyingLine] = useState<GenieAmbiguousLine | null>(null);
  const [committing, setCommitting] = useState(false);
  const lineIdsRef = useRef<Map<number, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCatalogue = useCallback(async () => {
    setCatalogueLoading(true);
    setCatalogueError(null);
    try {
      setCatalogue(await fetchCatalogue({ includeBuyerPrices: isApprovedBuyer }));
    } catch (e) {
      setCatalogueError(parseRpcError(e).message);
    } finally {
      setCatalogueLoading(false);
    }
  }, [isApprovedBuyer]);

  useEffect(() => {
    void loadCatalogue();
  }, [loadCatalogue]);

  const readyToCommit = useMemo(
    () => resolvedLines.length > 0 && ambiguousLines.length === 0 && unresolvedLines.length === 0,
    [resolvedLines, ambiguousLines, unresolvedLines]
  );

  async function parseOrder() {
    if (mode === "audio") {
      setError(
        "Voice ordering requires a verified ai-order-parse audio contract. Hindi, English, and Hinglish are supported once Core certifies the edge function."
      );
      return;
    }
    if (mode === "text" && !text.trim()) {
      setError("Enter an order in Hindi, English, or Hinglish before parsing.");
      return;
    }

    setParsing(true);
    setError(null);
    setNotice(null);
    try {
      const lines = await parseGenieIntake(mode, { text });
      resetLineIds();
      void clearGenieDraftLineCommits();
      setReviewLines(lines);
      applyResolution(lines);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setParsing(false);
    }
  }

  function getStableLineId(index: number): string {
    const existing = lineIdsRef.current.get(index);
    if (existing) return existing;
    const created = createIdempotencyKey();
    lineIdsRef.current.set(index, created);
    return created;
  }

  function resetLineIds() {
    lineIdsRef.current.clear();
  }

  function applyResolution(lines: ParsedLine[]) {
    const parsed: GenieParsedLine[] = lines.map((line, index) => ({
      lineId: getStableLineId(index),
      rawName: line.productName,
      quantity: line.quantity,
      uom: line.uom,
    }));
    const result = resolveGenieLines(parsed, catalogue);
    setResolvedLines(result.resolved);
    setAmbiguousLines(result.ambiguous);
    setUnresolvedLines(result.unresolved);
  }

  function updateLine(index: number, patch: Partial<ParsedLine>) {
    void clearGenieDraftLineCommit(getStableLineId(index));
    setReviewLines((prev) => {
      if (!prev) return prev;
      const next = prev.map((line, i) => (i === index ? { ...line, ...patch } : line));
      applyResolution(next);
      return next;
    });
  }

  function chooseCandidate(product: CatalogueProduct) {
    if (!clarifyingLine) return;
    const selected = applyGenieCandidateSelection(clarifyingLine, product);
    setAmbiguousLines((prev) => prev.filter((line) => line.lineId !== clarifyingLine.lineId));
    if ("product" in selected) {
      setResolvedLines((prev) => [...prev, selected]);
    } else {
      setUnresolvedLines((prev) => [...prev, selected]);
    }
    setClarifyingLine(null);
  }

  function resetReview() {
    resetLineIds();
    void clearGenieDraftLineCommits();
    setReviewLines(null);
    setResolvedLines([]);
    setAmbiguousLines([]);
    setUnresolvedLines([]);
    setClarifyingLine(null);
  }

  async function confirmOrder() {
    if (!readyToCommit || committing) return;
    setCommitting(true);
    setError(null);
    setNotice(null);
    try {
      for (const line of resolvedLines) {
        const commitLine = {
          lineId: line.lineId,
          productId: line.product.product_id,
          normalizedQuantity: line.normalizedQuantity,
        };
        if (await isGenieDraftLineCommitted(commitLine)) continue;
        await addCustomerOrderDraftLine(line.product.product_id, line.normalizedQuantity);
        await markGenieDraftLineCommitted(commitLine);
      }
      resetReview();
      navigation.navigate("Cart");
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setCommitting(false);
    }
  }

  const modeUnavailableCopy: Partial<Record<InputMode, string>> = {
    audio:
      "Voice ordering requires a verified ai-order-parse audio contract. Hindi, English, and Hinglish are supported once Core certifies the edge function.",
  };

  const parseLabel =
    mode === "text"
      ? "Parse with Oasis Genie"
      : mode === "image"
        ? "Choose PO photo"
        : mode === "document"
          ? "Choose PDF/Excel/PO file"
          : "Voice unavailable";

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Oasis Genie" subtitle="Voice · type · photo · PO · governed catalogue resolution">
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.tabs}>
            {(
              [
                ["text", "Type"],
                ["audio", "Voice"],
                ["image", "Photo/PO"],
                ["document", "PDF/Excel"],
              ] as const
            ).map(([value, label]) => (
              <TouchableOpacity key={value} style={[styles.tab, mode === value && styles.tabActive]} onPress={() => setMode(value)}>
                <Text style={[styles.tabText, mode === value && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {catalogueLoading ? <LoadingState message="Loading governed catalogue for alias resolution…" /> : null}
          {catalogueError ? <ErrorState message={catalogueError} onRetry={() => void loadCatalogue()} /> : null}

          {mode === "text" ? (
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="e.g. 20kg Kaju Katli, 10 box badam baklawa (Hindi/English/Hinglish)"
              value={text}
              onChangeText={setText}
            />
          ) : mode === "audio" ? (
            <View style={styles.unavailable}>
              <Text style={styles.unavailableText}>{modeUnavailableCopy.audio}</Text>
            </View>
          ) : (
            <View style={styles.unavailable}>
              <Text style={styles.unavailableText}>
                {mode === "image"
                  ? "Select a PO photo. Oasis Genie sends the image to the governed ai-order-parse edge function and resolves products against the published catalogue."
                  : "Select a PDF, Excel, CSV, or text PO file. Parsing fails closed when the edge contract rejects the document."}
              </Text>
            </View>
          )}

          <OasisButton
            label={parsing ? "Parsing…" : parseLabel}
            onPress={() => void parseOrder()}
            disabled={parsing || mode === "audio" || catalogueLoading || Boolean(catalogueError)}
            loading={parsing}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Text style={styles.helper}>
            Genie resolves names against the published catalogue only. Ambiguous or unknown products require your clarification — no invented SKU or quantity.
          </Text>
        </ScrollView>

        <Modal visible={!!reviewLines} animationType="slide" onRequestClose={resetReview}>
          <Screen title="Review Genie draft" subtitle="Confirm governed matches before adding to cart">
            <ScrollView contentContainerStyle={styles.reviewContent}>
              {(reviewLines ?? []).map((line, index) => (
                <View key={`${line.productName}-${index}`} style={styles.reviewRow}>
                  <TextInput
                    style={styles.reviewInput}
                    value={line.productName}
                    onChangeText={(value) => updateLine(index, { productName: value })}
                  />
                  <TextInput
                    style={styles.reviewQty}
                    keyboardType="numeric"
                    value={String(line.quantity)}
                    onChangeText={(value) => updateLine(index, { quantity: Number(value) || 0 })}
                  />
                  <Text style={styles.reviewUom}>{line.uom}</Text>
                </View>
              ))}

              {resolvedLines.map((line) => (
                <View key={`resolved-${line.lineId}`} style={styles.resolvedRow}>
                  <Text style={styles.resolvedTitle}>{line.product.product_name}</Text>
                  <Text style={styles.resolvedMeta}>
                    {line.normalizedQuantity} {line.product.price?.uom ?? line.uom} · {line.product.sku}
                  </Text>
                </View>
              ))}

              {ambiguousLines.map((line) => (
                <View key={`ambiguous-${line.lineId}`} style={styles.warningCard}>
                  <Text style={styles.warningTitle}>Clarify: {line.rawName}</Text>
                  <Text style={styles.warningMeta}>Multiple catalogue matches — choose one.</Text>
                  <OasisButton label="Choose product" variant="secondary" onPress={() => setClarifyingLine(line)} />
                </View>
              ))}

              {unresolvedLines.map((line) => (
                <View key={`unresolved-${line.lineId}`} style={styles.warningCard}>
                  <Text style={styles.warningTitle}>{line.rawName}</Text>
                  <Text style={styles.warningMeta}>{line.reason}</Text>
                </View>
              ))}

              <View style={styles.reviewActions}>
                <OasisButton label="Cancel" variant="secondary" onPress={resetReview} />
                <OasisButton
                  label={committing ? "Adding…" : "Add resolved lines to cart"}
                  onPress={() => void confirmOrder()}
                  disabled={!readyToCommit || committing}
                  loading={committing}
                />
              </View>
            </ScrollView>
          </Screen>
        </Modal>

        <Modal visible={!!clarifyingLine} animationType="fade" transparent onRequestClose={() => setClarifyingLine(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Choose catalogue product</Text>
              {(clarifyingLine?.candidates ?? []).map((product) => (
                <TouchableOpacity key={product.product_id} style={styles.candidateRow} onPress={() => chooseCandidate(product)}>
                  <Text style={styles.candidateTitle}>{product.product_name}</Text>
                  <Text style={styles.candidateMeta}>{product.sku}</Text>
                </TouchableOpacity>
              ))}
              <OasisButton label="Close" variant="secondary" onPress={() => setClarifyingLine(null)} />
            </View>
          </View>
        </Modal>
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  tab: {
    flexGrow: 1,
    minWidth: "45%",
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
  helper: { marginTop: spacing.md, fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, lineHeight: 18 },
  error: { color: colors.error, marginTop: spacing.sm, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm },
  notice: { color: colors.textSecondary, marginTop: spacing.sm, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm },
  unavailable: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md, backgroundColor: colors.surfaceUtility },
  unavailableText: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, lineHeight: 20 },
  reviewContent: { paddingBottom: spacing.xl, gap: spacing.sm },
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
  resolvedRow: { backgroundColor: colors.successSurface, borderRadius: 10, padding: spacing.md },
  resolvedTitle: { fontFamily: typography.fontFamilySansSemiBold, color: colors.textPrimary },
  resolvedMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textSecondary, marginTop: 4 },
  warningCard: { backgroundColor: colors.warningSurface, borderRadius: 10, padding: spacing.md, gap: spacing.sm },
  warningTitle: { fontFamily: typography.fontFamilySansSemiBold, color: colors.textPrimary },
  warningMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  reviewActions: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeLg, color: colors.textPrimary },
  candidateRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  candidateTitle: { fontFamily: typography.fontFamilySansSemiBold, color: colors.textPrimary },
  candidateMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted },
});
