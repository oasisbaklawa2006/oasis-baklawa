import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useFocusEffect, useIsFocused, type CompositeScreenProps } from "@react-navigation/native";
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
import {
  buildSupportTicketPayloadFingerprint,
  clearSupportTicketIdempotencyKey,
  getSupportTicketIdempotencyKey,
  isSupportTicketRetryOutcomeUnknownError,
  isSupportTicketRetryStorageUnavailableError,
} from "@/lib/support-ticket-idempotency";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerGeneralQuery, CustomerOrderStatus, CustomerSupportTicket } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Support">,
  NativeStackScreenProps<RootStackParamList>
>;

const ORDER_ISSUE_TYPES = ["Damaged goods", "Missing items", "Wrong shipment", "Delivery question", "Other order question"];

/** Buyer support surface with route-context order selection and governed idempotent submission. */
export function SupportScreen({ navigation, route }: Props) {
  const [tickets, setTickets] = useState<CustomerSupportTicket[]>([]);
  const [generalQueries, setGeneralQueries] = useState<CustomerGeneralQuery[]>([]);
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderId, setOrderId] = useState(route.params?.orderId ?? "");
  const isFocused = useIsFocused();
  const routeOrderSelection = useRef<string | null>(route.params?.orderId ?? null);
  const preserveRouteSelectionOnFocus = useRef(Boolean(route.params?.orderId));
  const hasFocused = useRef(false);
  const [issueType, setIssueType] = useState(ORDER_ISSUE_TYPES[0]);
  const [orderDescription, setOrderDescription] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketNotice, setTicketNotice] = useState<string | null>(null);
  const ticketSubmitInFlight = useRef(false);

  const [queryCategory, setQueryCategory] = useState<CustomerGeneralQueryCategory>("GENERAL");
  const [querySubject, setQuerySubject] = useState("");
  const [queryMessage, setQueryMessage] = useState("");
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [queryNotice, setQueryNotice] = useState<string | null>(null);
  const querySubmitInFlight = useRef(false);

  const fetchSupportRows = useCallback(
    () =>
      Promise.all([
        customerGateway.tickets(),
        customerGateway.generalQueries(),
        customerGateway.orders(),
      ]),
    []
  );

  const applySupportRows = useCallback(
    ([ticketRows, queryRows, orderRows]: Awaited<ReturnType<typeof fetchSupportRows>>) => {
      setTickets(ticketRows ?? []);
      setGeneralQueries(queryRows ?? []);
      setOrders(orderRows ?? []);
    },
    []
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      applySupportRows(await fetchSupportRows());
    } catch (e) {
      setError(parseRpcError(e).message);
    }
  }, [applySupportRows, fetchSupportRows]);

  useEffect(() => {
    const incomingOrderId = route.params?.orderId;
    if (!incomingOrderId) return;
    setOrderId(incomingOrderId);
    routeOrderSelection.current = incomingOrderId;
    preserveRouteSelectionOnFocus.current = !isFocused || !hasFocused.current;
    navigation.setParams({ orderId: undefined });
  }, [isFocused, navigation, route.params?.orderId]);

  useFocusEffect(
    useCallback(() => {
      hasFocused.current = true;
      if (preserveRouteSelectionOnFocus.current) {
        preserveRouteSelectionOnFocus.current = false;
        return;
      }
      if (routeOrderSelection.current) {
        routeOrderSelection.current = null;
        setOrderId("");
      }
    }, [])
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  /** Refreshes buyer-visible support data without mutating submission state. */
  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const communicationEntries = useMemo(
    () => buildBuyerCommunicationLog(tickets, generalQueries),
    [tickets, generalQueries]
  );

  /** Submits an order-linked support request through the governed idempotent gateway. */
  async function submitOrderTicket() {
    if (!orderId) {
      setTicketNotice("Select an order before submitting order support.");
      return;
    }
    if (!orderDescription.trim()) {
      setTicketNotice("Please describe your issue.");
      return;
    }
    if (ticketSubmitInFlight.current) return;
    ticketSubmitInFlight.current = true;
    setSubmittingTicket(true);
    setTicketNotice(null);
    try {
      const description = orderDescription.trim();
      const fingerprint = buildSupportTicketPayloadFingerprint({
        orderId,
        issueType,
        description,
      });
      const idempotencyKey = await getSupportTicketIdempotencyKey(fingerprint);
      const result = await customerGateway.submitTicket({
        idempotencyKey,
        orderId,
        issueType,
        description,
      });
      await clearSupportTicketIdempotencyKey();
      setOrderDescription("");
      const submittedNotice = result.is_duplicate_submission
        ? "This support request was already received. We have not created a duplicate."
        : "Your order support request has been submitted.";
      setTicketNotice(submittedNotice);
      try {
        applySupportRows(await fetchSupportRows());
      } catch {
        setTicketNotice(`${submittedNotice} Communication history could not refresh right now.`);
      }
    } catch (e) {
      if (isSupportTicketRetryOutcomeUnknownError(e)) {
        setTicketNotice(
          "A previous support request has an uncertain delivery outcome and cannot be matched safely from its text alone. Contact Oasis support for reconciliation before retrying; the app will not submit a possible duplicate automatically."
        );
      } else if (isSupportTicketRetryStorageUnavailableError(e)) {
        setTicketNotice(
          "Secure retry protection is temporarily unavailable on this device. No support request was submitted. Please try again after device storage is available."
        );
      } else {
        setTicketNotice(parseRpcError(e).message);
      }
    } finally {
      ticketSubmitInFlight.current = false;
      setSubmittingTicket(false);
    }
  }

  /** Submits a general enquiry through its governed idempotent gateway. */
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
    if (querySubmitInFlight.current) return;
    querySubmitInFlight.current = true;
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
      await clearGeneralQueryIdempotencyKey();
      setQuerySubject("");
      setQueryMessage("");
      const submittedNotice = result.is_duplicate_submission
        ? "This enquiry was already received. We have not created a duplicate."
        : "Your general enquiry has been submitted.";
      setQueryNotice(submittedNotice);
      try {
        applySupportRows(await fetchSupportRows());
      } catch {
        setQueryNotice(`${submittedNotice} Communication history could not refresh right now.`);
      }
    } catch (e) {
      setQueryNotice(parseRpcError(e).message);
    } finally {
      querySubmitInFlight.current = false;
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
              <View style={styles.form}>
                <Text style={styles.intro}>
                  Get help with an order or send us a general enquiry.
                </Text>

                <Text style={styles.sectionTitle}>Order support</Text>
                <Text style={styles.sectionCopy}>Choose the order you need help with.</Text>
                <View style={styles.chips}>
                  {orders.length === 0 ? (
                    <Text style={styles.emptyOrders}>No orders available for order-linked support yet.</Text>
                  ) : (
                    orders.map((order) => (
                      <TouchableOpacity
                        key={order.order_id}
                        style={[styles.chip, orderId === order.order_id && styles.chipActive]}
                        onPress={() => {
                          routeOrderSelection.current = null;
                          setOrderId(order.order_id);
                        }}
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
              </View>
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
    minHeight: 48,
    justifyContent: "center",
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.action,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 48,
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
