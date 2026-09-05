import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
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
import { buildBuyerCommunicationLog } from "@/lib/buyer-communication-log";
import {
  GENERAL_QUERY_CATEGORIES,
  customerGeneralQueryStatusLabel,
  type CustomerGeneralQueryCategory,
} from "@/lib/customer-projections";
import { clearGeneralQueryIdempotencyKey, getGeneralQueryIdempotencyKey } from "@/lib/general-query-idempotency";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerGeneralQuery, CustomerOrderStatus, CustomerSupportTicket } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Support">,
  NativeStackScreenProps<RootStackParamList>
>;

const ORDER_ISSUE_TYPES = ["Damaged goods", "Missing items", "Wrong shipment", "Delivery question", "Other order question"];

export function SupportScreen({ navigation }: Props) {
  const [tickets, setTickets] = useState<CustomerSupportTicket[]>([]);
  const [generalQueries, setGeneralQueries] = useState<CustomerGeneralQuery[]>([]);
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderId, setOrderId] = useState("");
  const [issueType, setIssueType] = useState(ORDER_ISSUE_TYPES[0]);
  const [orderDescription, setOrderDescription] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketNotice, setTicketNotice] = useState<string | null>(null);

  const [queryCategory, setQueryCategory] = useState<CustomerGeneralQueryCategory>("GENERAL");
  const [querySubject, setQuerySubject] = useState("");
  const [queryMessage, setQueryMessage] = useState("");
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [queryNotice, setQueryNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ticketRows, queryRows, orderRows] = await Promise.all([
        customerGateway.tickets(),
        customerGateway.generalQueries(),
        customerGateway.orders(),
      ]);
      setTickets(ticketRows ?? []);
      setGeneralQueries(queryRows ?? []);
      setOrders(orderRows ?? []);
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

  const communicationEntries = useMemo(
    () => buildBuyerCommunicationLog(tickets, generalQueries),
    [tickets, generalQueries]
  );

  async function submitOrderTicket() {
    if (!orderId) {
      setTicketNotice("Select an order before submitting order support.");
      return;
    }
    if (!orderDescription.trim()) {
      setTicketNotice("Please describe your issue.");
      return;
    }
    setSubmittingTicket(true);
    setTicketNotice(null);
    try {
      await customerGateway.submitTicket({
        orderId,
        issueType,
        description: orderDescription.trim(),
      });
      setOrderDescription("");
      setTicketNotice("Your order support request has been submitted.");
      await load();
    } catch (e) {
      setTicketNotice(parseRpcError(e).message);
    } finally {
      setSubmittingTicket(false);
    }
  }

  async function submitGeneralEnquiry() {
    const subject = querySubject.trim();
    const message = queryMessage.trim();
    if (subject.length < 3) {
      setQueryNotice("Subject must be at least 3 characters.");
      return;
    }
    if (message.length < 10) {
      setQueryNotice("Message must be at least 10 characters.");
      return;
    }
    setSubmittingQuery(true);
    setQueryNotice(null);
    try {
      const idempotencyKey = await getGeneralQueryIdempotencyKey();
      const result = await customerGateway.submitGeneralQuery({
        idempotencyKey,
        subject,
        message,
        category: queryCategory,
      });
      if (!result.is_duplicate_submission) {
        await clearGeneralQueryIdempotencyKey();
      }
      setQuerySubject("");
      setQueryMessage("");
      setQueryNotice("Your general enquiry has been submitted.");
      await load();
    } catch (e) {
      setQueryNotice(parseRpcError(e).message);
    } finally {
      setSubmittingQuery(false);
    }
  }

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Support" subtitle="Order support · General enquiries" scroll={false}>
        {loading ? (
          <LoadingState message="Loading support…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <FlatList
            data={communicationEntries}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.action} />}
            ListHeaderComponent={
              <ScrollView nestedScrollEnabled contentContainerStyle={styles.form}>
                <Text style={styles.intro}>
                  Order support and general enquiries use separate governed paths. A general enquiry never creates an order.
                </Text>

                <Text style={styles.sectionTitle}>Order support</Text>
                <Text style={styles.sectionCopy}>Choose an order so Core can route the request safely.</Text>
                <View style={styles.chips}>
                  {orders.length === 0 ? (
                    <Text style={styles.emptyOrders}>No orders available for order-linked support yet.</Text>
                  ) : (
                    orders.map((order) => (
                      <TouchableOpacity
                        key={order.order_id}
                        style={[styles.chip, orderId === order.order_id && styles.chipActive]}
                        onPress={() => setOrderId(order.order_id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: orderId === order.order_id }}
                      >
                        <Text style={[styles.chipText, orderId === order.order_id && styles.chipTextActive]}>
                          {order.order_number || "Order reference pending"}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
                <View style={styles.chips}>
                  {ORDER_ISSUE_TYPES.map((type) => (
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
                  placeholder="Describe the issue"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={orderDescription}
                  onChangeText={setOrderDescription}
                  accessibilityLabel="Order issue description"
                />
                <TouchableOpacity
                  style={[styles.button, (submittingTicket || !orderId) && styles.buttonDisabled]}
                  disabled={submittingTicket || !orderId}
                  onPress={submitOrderTicket}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>{submittingTicket ? "Submitting…" : "Submit order ticket"}</Text>
                </TouchableOpacity>
                {ticketNotice ? <Text style={styles.notice}>{ticketNotice}</Text> : null}

                <Text style={[styles.sectionTitle, styles.sectionGap]}>General enquiry</Text>
                <Text style={styles.sectionCopy}>Ask a question without attaching it to an order.</Text>
                <View style={styles.chips}>
                  {GENERAL_QUERY_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[styles.chip, queryCategory === category && styles.chipActive]}
                      onPress={() => setQueryCategory(category)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: queryCategory === category }}
                    >
                      <Text style={[styles.chipText, queryCategory === category && styles.chipTextActive]}>
                        {category[0] + category.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Subject"
                  placeholderTextColor={colors.textMuted}
                  value={querySubject}
                  onChangeText={setQuerySubject}
                  accessibilityLabel="General enquiry subject"
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell us more"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={queryMessage}
                  onChangeText={setQueryMessage}
                  accessibilityLabel="General enquiry message"
                />
                <TouchableOpacity
                  style={[styles.buttonOutline, submittingQuery && styles.buttonDisabled]}
                  disabled={submittingQuery}
                  onPress={submitGeneralEnquiry}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonOutlineText}>{submittingQuery ? "Submitting…" : "Submit general enquiry"}</Text>
                </TouchableOpacity>
                {queryNotice ? <Text style={styles.notice}>{queryNotice}</Text> : null}

                <Text style={[styles.sectionTitle, styles.listHeader]}>Communication log</Text>
                <Text style={styles.sectionCopy}>Order-linked tickets and general enquiries, newest first.</Text>
              </ScrollView>
            }
            renderItem={({ item }) =>
              item.kind === "general_enquiry" && item.query ? (
                <View style={styles.logCard}>
                  <Text style={styles.logTitle}>{item.query.subject}</Text>
                  <Text style={styles.logMeta}>
                    General enquiry · {item.query.category} · {customerGeneralQueryStatusLabel(item.query.status)}
                  </Text>
                  <Text style={styles.logDesc} numberOfLines={2}>
                    {item.query.message}
                  </Text>
                </View>
              ) : item.ticket ? (
                <View style={styles.logCard}>
                  <Text style={styles.logTitle}>{item.ticket.issue_type}</Text>
                  <Text style={styles.logMeta}>
                    {item.ticket.customer_status.replace(/_/g, " ")} · {item.ticket.order_number || "Order support"}
                  </Text>
                  <Text style={styles.logDesc} numberOfLines={2}>
                    {item.ticket.description}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                title="No communications yet"
                message="Order support tickets and general enquiries will appear here after you submit them."
              />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, marginTop: spacing.md, paddingBottom: spacing.md },
  intro: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  sectionTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeLg, color: colors.textPrimary },
  sectionCopy: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  sectionGap: { marginTop: spacing.lg },
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
  emptyOrders: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  button: {
    backgroundColor: colors.action,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.action,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  buttonOutlineText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.action },
  notice: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  list: { paddingBottom: spacing.xl },
  logCard: {
    backgroundColor: colors.surfacePremium,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  logTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  logMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 4 },
  logDesc: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, marginTop: 6 },
});
