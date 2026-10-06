import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { BuyerServiceRequestPanel } from "@/components/BuyerServiceRequestPanel";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import {
  deleteCustomerSavedTransporter,
  fetchCustomerSavedTransporters,
  fetchCustomerShippingPreference,
  upsertCustomerSavedTransporter,
} from "@/lib/api/account-preferences";
import { createIdempotencyKey } from "@/lib/idempotency";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerSavedTransporter, CustomerShippingPreference } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Transporter">;

type Draft = {
  transporterId: string;
  transporterName: string;
  accountNumber: string;
  isDefault: boolean;
  isActive: boolean;
};

function blankDraft(): Draft {
  return {
    transporterId: createIdempotencyKey(),
    transporterName: "",
    accountNumber: "",
    isDefault: false,
    isActive: true,
  };
}

function draftFromRow(row: CustomerSavedTransporter): Draft {
  return {
    transporterId: row.transporter_id,
    transporterName: row.transporter_name,
    accountNumber: row.account_number ?? "",
    isDefault: row.is_default,
    isActive: row.is_active,
  };
}

export function TransporterScreen({ navigation }: Props) {
  const [rows, setRows] = useState<CustomerSavedTransporter[]>([]);
  const [legacyPreference, setLegacyPreference] = useState<CustomerShippingPreference | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blankDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [saved, preference] = await Promise.all([
        fetchCustomerSavedTransporters(),
        fetchCustomerShippingPreference(),
      ]);
      setRows(saved);
      setLegacyPreference(preference);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const editing = useMemo(
    () => rows.some((row) => row.transporter_id === draft.transporterId),
    [draft.transporterId, rows]
  );

  async function save() {
    if (!draft.transporterName.trim()) {
      setNotice("Transporter name is required.");
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const saved = await upsertCustomerSavedTransporter({
        transporterId: draft.transporterId,
        transporterName: draft.transporterName.trim(),
        accountNumber: draft.accountNumber.trim() || null,
        isDefault: draft.isDefault,
        isActive: draft.isActive,
      });
      setDraft(draftFromRow(saved));
      setNotice(editing ? "Transporter updated." : "Transporter saved.");
      await load();
    } catch (e) {
      setNotice(parseRpcError(e).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    setNotice(null);
    try {
      await deleteCustomerSavedTransporter(id);
      if (draft.transporterId === id) setDraft(blankDraft());
      setNotice("Transporter removed.");
      await load();
    } catch (e) {
      setNotice(parseRpcError(e).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <BuyerGate requireApprovedBuyer onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Preferred Transporter" subtitle="Saved dispatch preferences">
        {loading ? (
          <LoadingState message="Loading transporter preferences…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            {legacyPreference?.preferred_transporter ? (
              <View style={styles.preferenceCard}>
                <Text style={styles.eyebrow}>CURRENT DEFAULT</Text>
                <Text style={styles.preferenceTitle}>{legacyPreference.preferred_transporter}</Text>
                {legacyPreference.transporter_account_number ? (
                  <Text style={styles.meta}>Account: {legacyPreference.transporter_account_number}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Saved transporters</Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  setDraft(blankDraft());
                  setNotice(null);
                }}
              >
                <Text style={styles.link}>Add new</Text>
              </TouchableOpacity>
            </View>

            {rows.length === 0 ? (
              <Text style={styles.empty}>No saved transporters yet.</Text>
            ) : (
              rows.map((row) => (
                <View key={row.transporter_id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{row.transporter_name}</Text>
                    {row.is_default ? <Text style={styles.badge}>DEFAULT</Text> : null}
                  </View>
                  {row.account_number ? <Text style={styles.meta}>Account: {row.account_number}</Text> : null}
                  {!row.is_active ? <Text style={styles.inactive}>Inactive</Text> : null}
                  <View style={styles.actions}>
                    <OasisButton
                      label="Edit"
                      variant="secondary"
                      onPress={() => {
                        setDraft(draftFromRow(row));
                        setNotice(null);
                      }}
                    />
                    <OasisButton
                      label={deletingId === row.transporter_id ? "Removing…" : "Remove"}
                      variant="secondary"
                      disabled={Boolean(deletingId)}
                      onPress={() => {
                        void remove(row.transporter_id);
                      }}
                    />
                  </View>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>{editing ? "Edit transporter" : "Add transporter"}</Text>
            <Text style={styles.fieldLabel}>Transporter name</Text>
            <TextInput
              style={styles.input}
              value={draft.transporterName}
              onChangeText={(value) => setDraft((current) => ({ ...current, transporterName: value }))}
              placeholder="Transport company"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.fieldLabel}>Account / customer number (optional)</Text>
            <TextInput
              style={styles.input}
              value={draft.accountNumber}
              onChangeText={(value) => setDraft((current) => ({ ...current, accountNumber: value }))}
              placeholder="Transporter account number"
              placeholderTextColor={colors.textMuted}
            />

            <Toggle
              label="Use as default transporter"
              checked={draft.isDefault}
              onPress={() => setDraft((current) => ({ ...current, isDefault: !current.isDefault }))}
            />
            <Toggle
              label="Active"
              checked={draft.isActive}
              onPress={() => setDraft((current) => ({ ...current, isActive: !current.isActive }))}
            />

            <OasisButton
              label={editing ? "Save changes" : "Save transporter"}
              onPress={() => {
                void save();
              }}
              loading={saving}
            />
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <BuyerServiceRequestPanel
              category="DELIVERY"
              subject="Transporter assistance request"
              intro="Saved transporter preferences can be managed above. Use this request only for route, dispatch or transporter assistance that needs Oasis operations review."
              placeholder="State the route, destination, transporter issue or special dispatch instruction…"
              submitLabel="Request dispatch assistance"
              historyTitle="Transporter assistance requests"
            />
          </>
        )}
      </Screen>
    </BuyerGate>
  );
}

function Toggle({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.toggle}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.check, checked && styles.checked]} />
      <Text style={styles.toggleText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  preferenceCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surfacePremium,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  eyebrow: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  preferenceTitle: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamilySerifBold,
    fontSize: typography.sizeLg,
    color: colors.textPrimary,
  },
  headerRow: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamilySerifBold,
    fontSize: typography.sizeLg,
    color: colors.textPrimary,
  },
  link: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeSm,
    color: colors.action,
  },
  empty: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textMuted,
  },
  card: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeMd,
    color: colors.textPrimary,
  },
  badge: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeXs,
    color: colors.action,
  },
  meta: {
    marginTop: 4,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
  },
  inactive: {
    marginTop: 4,
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
  },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  fieldLabel: {
    marginTop: spacing.sm,
    marginBottom: 6,
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    backgroundColor: colors.white,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
  },
  toggle: {
    minHeight: 44,
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checked: { backgroundColor: colors.action, borderColor: colors.action },
  toggleText: {
    flex: 1,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    color: colors.textPrimary,
  },
  notice: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textSecondary,
  },
});
