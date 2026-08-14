import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { customerGateway } from "@/services/customerGateway";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerSupportTicket } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Support">,
  NativeStackScreenProps<RootStackParamList>
>;

const ISSUE_TYPES = ["Order issue", "Delivery", "Quality", "Pricing", "Account", "Other"];

export function SupportScreen({ navigation }: Props) {
  const [tickets, setTickets] = useState<CustomerSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTickets(await customerGateway.tickets());
    } catch (e) {
      setError(parseRpcError(e).message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function submit() {
    if (!message.trim()) {
      setNotice("Please describe your issue.");
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await customerGateway.submitTicket({
        orderId: "",
        issueType,
        description: `${subject.trim() ? `${subject.trim()}\n\n` : ""}${message.trim()}`,
      });
      setSubject("");
      setMessage("");
      setNotice("Your request has been submitted to buyer support.");
      await load();
    } catch (e) {
      setNotice(parseRpcError(e).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Support" subtitle="Raise a ticket · Track responses" scroll={false}>
        {loading ? (
          <LoadingState message="Loading support tickets…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.ticket_id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.action} />}
            ListHeaderComponent={
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Raise a ticket</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Subject (optional)"
                  placeholderTextColor={colors.textMuted}
                  value={subject}
                  onChangeText={setSubject}
                  accessibilityLabel="Ticket subject"
                />
                <View style={styles.chips}>
                  {ISSUE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, issueType === type && styles.chipActive]}
                      onPress={() => setIssueType(type)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: issueType === type }}
                    >
                      <Text style={[styles.chipText, issueType === type && styles.chipTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your issue"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={message}
                  onChangeText={setMessage}
                  accessibilityLabel="Issue description"
                />
                <TouchableOpacity
                  style={[styles.button, submitting && styles.buttonDisabled]}
                  disabled={submitting}
                  onPress={submit}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>{submitting ? "Submitting…" : "Submit ticket"}</Text>
                </TouchableOpacity>
                {notice ? <Text style={styles.notice}>{notice}</Text> : null}
                <Text style={[styles.sectionTitle, styles.listHeader]}>Recent tickets</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.ticketCard}>
                <Text style={styles.ticketTitle}>{item.issue_type}</Text>
                <Text style={styles.ticketMeta}>
                  {item.customer_status.replace(/_/g, " ")} · {item.order_number || "General"}
                </Text>
                <Text style={styles.ticketDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <EmptyState title="No tickets yet" message="Submit a request above and our team will respond." />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, marginTop: spacing.md },
  sectionTitle: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeLg,
    color: colors.textPrimary,
  },
  listHeader: { marginTop: spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceUtility,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: { backgroundColor: colors.action, borderColor: colors.action },
  chipText: { fontFamily: typography.fontFamilySansMedium, fontSize: typography.sizeXs, color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  button: {
    backgroundColor: colors.action,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  notice: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  list: { paddingBottom: spacing.xl },
  ticketCard: {
    backgroundColor: colors.surfacePremium,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ticketTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  ticketMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 4 },
  ticketDesc: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, marginTop: 6 },
});
