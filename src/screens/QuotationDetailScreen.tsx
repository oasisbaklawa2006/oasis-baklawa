import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useNetwork } from "@/context/NetworkContext";
import {
  clearQuoteAcceptIdempotencyKey,
  clearQuoteDeclineIdempotencyKey,
  getQuoteAcceptIdempotencyKey,
  getQuoteDeclineIdempotencyKey,
  type ResolvedQuoteIdempotency,
} from "@/lib/quote-idempotency";
import {
  customerQuotationStatusLabel,
  quotationExpiryLabel,
  termsSnapshotLabel,
} from "@/lib/quote-projections";
import { formatInr } from "@/lib/customer-projections";
import {
  isQuoteAcceptEnabled,
  isQuoteDeclineEnabled,
  isQuotationVersionStaleError,
  quotationDetailForAccept,
} from "@/lib/quote-guards";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerQuotationDetail, CustomerQuotationLine } from "@/types/quote-contract";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "QuotationDetail">;

export function QuotationDetailScreen({ navigation, route }: Props) {
  const { quotationId, quotationNumber } = route.params;
  const { isOnline } = useNetwork();
  const [detail, setDetail] = useState<CustomerQuotationDetail | null>(null);
  const [lines, setLines] = useState<CustomerQuotationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [acceptKey, setAcceptKey] = useState<ResolvedQuoteIdempotency | null>(null);
  const [declineKey, setDeclineKey] = useState<ResolvedQuoteIdempotency | null>(null);
  const [handoffId, setHandoffId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRow, lineRows] = await Promise.all([
        customerGateway.quotationDetail(quotationId),
        customerGateway.quotationLines(quotationId),
      ]);
      if (!detailRow) {
        setError("This quotation could not be loaded for your account.");
        setDetail(null);
        setLines([]);
        return;
      }
      setDetail(detailRow);
      setLines(lineRows);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getQuoteAcceptIdempotencyKey(quotationId).then(setAcceptKey);
    void getQuoteDeclineIdempotencyKey(quotationId).then(setDeclineKey);
  }, [quotationId]);

  const actionTarget = quotationDetailForAccept(detail);
  const actionInFlight = accepting || declining;
  const acceptEnabled = actionTarget
    ? isQuoteAcceptEnabled({
        quotation: actionTarget,
        accepting,
        keyReady: Boolean(acceptKey?.key),
        idempotencyKey: acceptKey?.key ?? null,
        keyPersisted: acceptKey?.persisted ?? false,
        isOnline,
      }) && !actionInFlight
    : false;
  const declineEnabled = actionTarget
    ? isQuoteDeclineEnabled({
        quotation: actionTarget,
        declining,
        keyReady: Boolean(declineKey?.key),
        idempotencyKey: declineKey?.key ?? null,
        keyPersisted: declineKey?.persisted ?? false,
        isOnline,
      }) && !actionInFlight
    : false;

  async function onAccept() {
    if (!detail || !acceptKey?.key || !acceptKey.persisted || actionInFlight) return;
    setAccepting(true);
    setNotice(null);
    try {
      const result = await customerGateway.acceptQuotation({
        quotationId: detail.quotation_id,
        versionNumber: detail.current_version,
        idempotencyKey: acceptKey.key,
      });
      await clearQuoteAcceptIdempotencyKey(quotationId);
      setAcceptKey(await getQuoteAcceptIdempotencyKey(quotationId));
      setHandoffId(result.handoff_id);
      setNotice(
        result.handoff_status === "pending"
          ? "Acceptance recorded. A governed handoff is pending — order submission remains a separate next step."
          : "Acceptance recorded."
      );
      await load();
    } catch (e) {
      const parsed = parseRpcError(e);
      if (isQuotationVersionStaleError(parsed.raw ?? parsed.message)) {
        setNotice("This quotation was updated. Refreshing the latest version…");
        await load();
      } else {
        setNotice(parsed.message);
      }
    } finally {
      setAccepting(false);
    }
  }

  async function onDecline() {
    if (!detail || !declineKey?.key || !declineKey.persisted || actionInFlight) return;
    setDeclining(true);
    setNotice(null);
    try {
      await customerGateway.declineQuotation({
        quotationId: detail.quotation_id,
        versionNumber: detail.current_version,
        idempotencyKey: declineKey.key,
      });
      await clearQuoteDeclineIdempotencyKey(quotationId);
      setDeclineKey(await getQuoteDeclineIdempotencyKey(quotationId));
      setNotice("Quotation declined.");
      await load();
    } catch (e) {
      const parsed = parseRpcError(e);
      if (isQuotationVersionStaleError(parsed.raw ?? parsed.message)) {
        setNotice("This quotation was updated. Refreshing the latest version…");
        await load();
      } else {
        setNotice(parsed.message);
      }
    } finally {
      setDeclining(false);
    }
  }

  const termsLabel = termsSnapshotLabel(detail?.terms_snapshot ?? null);

  return (
    <BuyerGate>
      <Screen title="Quotation detail" subtitle={quotationNumber}>
        {loading ? (
          <LoadingState message="Loading quotation…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : detail ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.summaryCard}>
              <Text style={styles.status}>{customerQuotationStatusLabel(detail.status)}</Text>
              <Text style={styles.total}>{formatInr(detail.quotation_value)}</Text>
              <Text style={styles.meta}>Advance required {formatInr(detail.advance_required)}</Text>
              <Text style={styles.meta}>
                Version {detail.current_version} · {quotationExpiryLabel(detail.expires_at)}
              </Text>
              {termsLabel ? <Text style={styles.meta}>{termsLabel}</Text> : null}
              {detail.request_notes ? <Text style={styles.notes}>{detail.request_notes}</Text> : null}
            </View>

            <Text style={styles.section}>Line items</Text>
            {lines.map((line) => (
              <View key={line.line_id} style={styles.lineCard}>
                <Text style={styles.lineTitle}>{line.product_name}</Text>
                <Text style={styles.lineMeta}>{line.sku} · Qty {line.quantity}</Text>
                <Text style={styles.lineValue}>{formatInr(line.line_total)}</Text>
              </View>
            ))}

            {handoffId ? (
              <View style={styles.handoffCard}>
                <Text style={styles.handoffTitle}>Acceptance handoff recorded</Text>
                <Text style={styles.handoffMeta}>
                  Core recorded handoff {handoffId}. Track fulfilment in Orders; advance payment opens when finance facts are available.
                </Text>
                <OasisButton label="View orders" variant="secondary" onPress={() => navigation.navigate("MainTabs", { screen: "Orders" })} />
              </View>
            ) : null}

            {detail.is_actionable ? (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.acceptButton, !acceptEnabled && styles.buttonDisabled]}
                  disabled={!acceptEnabled}
                  onPress={() => void onAccept()}
                  accessibilityRole="button"
                >
                  <Text style={styles.acceptText}>{accepting ? "Accepting…" : "Accept quotation"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.declineButton, !declineEnabled && styles.buttonDisabled]}
                  disabled={!declineEnabled}
                  onPress={() => void onDecline()}
                  accessibilityRole="button"
                >
                  <Text style={styles.declineText}>{declining ? "Declining…" : "Decline quotation"}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          </ScrollView>
        ) : null}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  summaryCard: {
    backgroundColor: colors.surfacePremium,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  status: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted, textTransform: "capitalize" },
  total: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeXl, color: colors.action },
  meta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  notes: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textPrimary, marginTop: spacing.sm },
  section: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeLg, color: colors.textPrimary, marginTop: spacing.md },
  lineCard: {
    backgroundColor: colors.surfacePremium,
    borderRadius: 10,
    padding: spacing.md,
    gap: 4,
  },
  lineTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  lineMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  lineValue: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  handoffCard: {
    backgroundColor: colors.surfacePremium,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.action,
    gap: spacing.xs,
  },
  handoffTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.action },
  handoffMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  acceptButton: {
    backgroundColor: colors.action,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  acceptText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  declineButton: {
    borderWidth: 1,
    borderColor: colors.textMuted,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  declineText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.textPrimary },
  buttonDisabled: { opacity: 0.5 },
  notice: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, textAlign: "center" },
});
