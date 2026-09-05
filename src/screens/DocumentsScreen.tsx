import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  documentAvailability,
  documentDetail,
  documentStatusLabel,
  formatInr,
  proformaAvailability,
  proformaDetail,
  type DocumentAvailability,
} from "@/lib/customer-projections";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type {
  CustomerDocument,
  CustomerOrderStatus,
  CustomerProformaInvoiceFacts,
  CustomerStatement,
} from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Documents">;

function DocumentCard({
  label,
  status,
  detail,
}: {
  label: string;
  status: DocumentAvailability;
  detail: string;
}) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.statusBadge}>{documentStatusLabel(status)}</Text>
      </View>
      <Text style={styles.cardDetail}>{detail}</Text>
    </View>
  );
}

function OrderDocumentsSection({
  order,
  documents,
  proformaInvoices,
}: {
  order: CustomerOrderStatus;
  documents: CustomerDocument[];
  proformaInvoices: CustomerProformaInvoiceFacts[];
}) {
  const orderDocuments = documents.filter((document) => document.order_id === order.order_id);
  const salesOrder = orderDocuments.find((document) => document.document_type === "SALES_ORDER");
  const proforma = proformaInvoices.find((invoice) => invoice.order_id === order.order_id);
  const proformaDocument = orderDocuments.find((document) => document.document_type === "PROFORMA_INVOICE");
  const finalInvoice = orderDocuments.find((document) => document.document_type === "FINAL_INVOICE");

  const salesOrderDetail = salesOrder
    ? documentDetail(salesOrder, "Your submitted order reference is available in Orders.")
    : "Your submitted order reference is available in Orders.";

  return (
    <View style={styles.orderSection}>
      <Text style={styles.orderTitle}>{order.order_number || "Sales order reference pending"}</Text>
      <Text style={styles.orderSubtitle}>Documents for this order</Text>
      <DocumentCard
        label="Sales Order"
        status={salesOrder ? documentAvailability(salesOrder.availability_state) : "available"}
        detail={salesOrderDetail}
      />
      <DocumentCard
        label="Proforma Invoice"
        status={proformaAvailability(proforma, proformaDocument)}
        detail={proformaDetail(proforma, proformaDocument)}
      />
      <DocumentCard
        label="Final Invoice"
        status={finalInvoice ? documentAvailability(finalInvoice.availability_state) : "upstream-unavailable"}
        detail={finalInvoice ? documentDetail(finalInvoice, "This document will appear here when it is issued.") : "This document will appear here when it is issued."}
      />
    </View>
  );
}

function StatementSection({ statement }: { statement: CustomerStatement | null }) {
  const statementStatus: DocumentAvailability = statement?.statement_facts_only ? "available" : "upstream-unavailable";

  return (
    <View style={styles.statementSection}>
      <DocumentCard
        label="Statement"
        status={statementStatus}
        detail={
          statement?.statement_facts_only
            ? "Statement facts are available below."
            : "Statements will appear here when they are available."
        }
      />
      {statement?.statement_facts_only ? (
        <View style={styles.statementFacts}>
          <Text style={styles.sectionTitle}>Statement facts</Text>
          <Text style={styles.sectionCopy}>Customer-safe ledger facts supplied by Finance.</Text>
          {statement.wallet_balance !== null ? (
            <View style={styles.walletRow}>
              <Text style={styles.walletLabel}>Wallet balance</Text>
              <Text style={styles.walletValue}>{formatInr(statement.wallet_balance)}</Text>
            </View>
          ) : null}
          {statement.entries.length === 0 ? (
            <Text style={styles.emptyCopy}>No issued statement entries yet.</Text>
          ) : (
            statement.entries.map((entry, index) => (
              <View key={`${entry.order_id || "entry"}-${index}`} style={styles.statementEntry}>
                <View style={styles.statementEntryHeader}>
                  <Text style={styles.statementEntryTitle}>{entry.invoice_number || "Issued invoice"}</Text>
                  <Text style={styles.statementEntryAmount}>{formatInr(entry.invoice_gross_total)}</Text>
                </View>
                {entry.pre_dispatch_net_due !== null ? (
                  <Text style={styles.statementEntryMeta}>
                    Amount due before dispatch: {formatInr(entry.pre_dispatch_net_due)}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

export function DocumentsScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [proformaInvoices, setProformaInvoices] = useState<CustomerProformaInvoiceFacts[]>([]);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [orderRows, documentRows, proformaRows, statementRow] = await Promise.all([
        customerGateway.orders(),
        customerGateway.documents(),
        customerGateway.proformaInvoices(),
        customerGateway.statement(),
      ]);
      setOrders(orderRows ?? []);
      setDocuments(documentRows ?? []);
      setProformaInvoices(proformaRows ?? []);
      setStatement(statementRow);
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

  const hasOrders = orders.length > 0;
  const introCopy = useMemo(
    () => "Documents appear when issued. We never create local numbers or files.",
    []
  );

  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Documents" subtitle="Invoices · Pro-forma · Transport copies">
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.intro}>{introCopy}</Text>
        {loading ? (
          <LoadingState message="Loading documents…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {hasOrders ? (
              orders.map((order) => (
                <OrderDocumentsSection
                  key={order.order_id}
                  order={order}
                  documents={documents}
                  proformaInvoices={proformaInvoices}
                />
              ))
            ) : (
              <View style={styles.emptyDocuments}>
                <DocumentCard
                  label="Sales Order"
                  status="not-issued"
                  detail="Your Sales Order reference will appear after a successful submission."
                />
                <DocumentCard
                  label="Proforma Invoice"
                  status="upstream-unavailable"
                  detail="This document will appear when your order is ready."
                />
                <DocumentCard
                  label="Final Invoice"
                  status="upstream-unavailable"
                  detail="This document will appear here when it is issued."
                />
              </View>
            )}
            <StatementSection statement={statement} />
            {!hasOrders ? (
              <EmptyState
                title="No orders yet"
                message="Browse the catalogue to place your first order. Documents will appear here once issued."
              />
            ) : null}
          </ScrollView>
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  back: {
    fontFamily: typography.fontFamilySansMedium,
    color: colors.action,
    marginTop: spacing.sm,
  },
  intro: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  scroll: { paddingBottom: spacing.xl, gap: spacing.lg },
  orderSection: { gap: spacing.sm },
  orderTitle: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeLg,
    color: colors.textPrimary,
  },
  orderSubtitle: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surfacePremium,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, alignItems: "flex-start" },
  cardTitle: { flex: 1, fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  statusBadge: {
    fontFamily: typography.fontFamilySansMedium,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
    backgroundColor: colors.surfaceUtility,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardDetail: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyDocuments: { gap: spacing.sm },
  statementSection: { gap: spacing.sm, marginTop: spacing.md },
  statementFacts: {
    backgroundColor: colors.surfacePremium,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeLg, color: colors.textPrimary },
  sectionCopy: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  walletRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  walletLabel: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  walletValue: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  emptyCopy: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  statementEntry: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    padding: spacing.sm,
  },
  statementEntryHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  statementEntryTitle: { flex: 1, fontFamily: typography.fontFamilySansMedium, fontSize: typography.sizeSm, color: colors.textPrimary },
  statementEntryAmount: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  statementEntryMeta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 4 },
});
