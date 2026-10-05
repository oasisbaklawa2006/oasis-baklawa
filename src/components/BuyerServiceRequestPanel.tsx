import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { OasisButton } from "@/components/OasisButton";
import { ErrorState, LoadingState } from "@/components/StateViews";
import {
  customerGeneralQueryStatusLabel,
  type CustomerGeneralQueryCategory,
} from "@/lib/customer-projections";
import {
  clearGeneralQueryIdempotencyKey,
  getGeneralQueryIdempotencyKey,
} from "@/lib/general-query-idempotency";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerGeneralQuery } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

interface BuyerServiceRequestPanelProps {
  category: CustomerGeneralQueryCategory;
  subject: string;
  intro: string;
  placeholder: string;
  submitLabel: string;
  historyTitle?: string;
}

/**
 * Converts unsupported account/catalogue master-data surfaces into a real,
 * governed Buyer request workflow without pretending the request has already
 * changed authoritative company/product data. This is the deliberate live
 * fallback until Core exposes the corresponding customer-safe master projection.
 */
export function BuyerServiceRequestPanel({
  category,
  subject,
  intro,
  placeholder,
  submitLabel,
  historyTitle = "Previous requests",
}: BuyerServiceRequestPanelProps) {
  const [queries, setQueries] = useState<CustomerGeneralQuery[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setQueries(await customerGateway.generalQueries());
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const history = useMemo(
    () =>
      queries
        .filter((query) => query.category === category && query.subject === subject)
        .slice()
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 5),
    [category, queries, subject]
  );

  async function submit() {
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setNotice("Please add at least 10 characters so the Oasis team has enough detail to act.");
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const idempotencyKey = await getGeneralQueryIdempotencyKey();
      const result = await customerGateway.submitGeneralQuery({
        idempotencyKey,
        subject,
        message: trimmed,
        category,
      });
      await clearGeneralQueryIdempotencyKey();
      setMessage("");
      setNotice(
        result.is_duplicate_submission
          ? "This request was already received. A duplicate was not created."
          : "Your request has been submitted to Oasis."
      );
      await load();
    } catch (e) {
      setNotice(parseRpcError(e).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading your requests…" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>{intro}</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={subject}
      />
      <OasisButton label={submitLabel} onPress={submit} loading={submitting} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.disclaimer}>
        Submitting a request creates an auditable enquiry. It does not itself change catalogue eligibility, saved account data, pricing, or dispatch authority.
      </Text>

      <Text style={styles.historyTitle}>{historyTitle}</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>No previous requests of this type.</Text>
      ) : (
        history.map((query) => (
          <View key={query.query_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.status}>{customerGeneralQueryStatusLabel(query.status)}</Text>
              <Text style={styles.date}>
                {query.created_at ? new Date(query.created_at).toLocaleDateString() : ""}
              </Text>
            </View>
            <Text style={styles.message}>{query.message}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, gap: spacing.md },
  intro: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  input: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.white,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    textAlignVertical: "top",
  },
  notice: {
    fontFamily: typography.fontFamilySansMedium,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  disclaimer: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  historyTitle: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamilySerifBold,
    fontSize: typography.sizeLg,
    color: colors.textPrimary,
  },
  empty: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surfacePremium,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: spacing.md,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  status: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeXs,
    color: colors.accentBronze,
  },
  date: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
  },
  message: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
