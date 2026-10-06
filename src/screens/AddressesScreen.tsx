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
  deleteCustomerDeliveryAddress,
  fetchCustomerDeliveryAddresses,
  upsertCustomerDeliveryAddress,
} from "@/lib/api/account-preferences";
import { fetchCustomerCompany } from "@/lib/api/buyer";
import { createIdempotencyKey } from "@/lib/idempotency";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerCompany, CustomerDeliveryAddress } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Addresses">;

type AddressDraft = {
  addressId: string;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  contactPhone: string;
  isDefault: boolean;
};

function blankDraft(): AddressDraft {
  return {
    addressId: createIdempotencyKey(),
    label: "",
    streetAddress: "",
    city: "",
    state: "",
    pincode: "",
    contactPerson: "",
    contactPhone: "",
    isDefault: false,
  };
}

function draftFromRow(row: CustomerDeliveryAddress): AddressDraft {
  return {
    addressId: row.address_id,
    label: row.label,
    streetAddress: row.street_address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    contactPerson: row.contact_person ?? "",
    contactPhone: row.contact_phone ?? "",
    isDefault: row.is_default,
  };
}

export function AddressesScreen({ navigation }: Props) {
  const [company, setCompany] = useState<CustomerCompany | null>(null);
  const [addresses, setAddresses] = useState<CustomerDeliveryAddress[]>([]);
  const [draft, setDraft] = useState<AddressDraft>(() => blankDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyRow, addressRows] = await Promise.all([
        fetchCustomerCompany(),
        fetchCustomerDeliveryAddresses(),
      ]);
      setCompany(companyRow);
      setAddresses(addressRows);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const editingExisting = useMemo(
    () => addresses.some((row) => row.address_id === draft.addressId),
    [addresses, draft.addressId]
  );

  function updateDraft<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    setDraft(blankDraft());
    setNotice(null);
  }

  async function save() {
    if (
      !draft.label.trim() ||
      !draft.streetAddress.trim() ||
      !draft.city.trim() ||
      !draft.state.trim() ||
      !draft.pincode.trim()
    ) {
      setNotice("Label, street address, city, state and pincode are required.");
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const saved = await upsertCustomerDeliveryAddress({
        addressId: draft.addressId,
        label: draft.label.trim(),
        streetAddress: draft.streetAddress.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        pincode: draft.pincode.trim(),
        contactPerson: draft.contactPerson.trim() || null,
        contactPhone: draft.contactPhone.trim() || null,
        isDefault: draft.isDefault,
      });
      setNotice(editingExisting ? "Address updated." : "Address saved.");
      setDraft(draftFromRow(saved));
      await load();
    } catch (e) {
      setNotice(parseRpcError(e).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(addressId: string) {
    if (deletingId) return;
    setDeletingId(addressId);
    setNotice(null);
    try {
      await deleteCustomerDeliveryAddress(addressId);
      if (draft.addressId === addressId) setDraft(blankDraft());
      setNotice("Address removed.");
      await load();
    } catch (e) {
      setNotice(parseRpcError(e).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <BuyerGate requireApprovedBuyer onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Addresses" subtitle="Saved delivery addresses">
        {loading ? (
          <LoadingState message="Loading saved addresses…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            {company?.registered_address ? (
              <View style={styles.registeredCard}>
                <Text style={styles.eyebrow}>REGISTERED COMPANY ADDRESS</Text>
                <Text style={styles.value}>{company.registered_address}</Text>
                <Text style={styles.helper}>This registered address remains an account fact. Delivery addresses below are managed separately.</Text>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved delivery addresses</Text>
              <TouchableOpacity onPress={startNew} accessibilityRole="button">
                <Text style={styles.link}>Add new</Text>
              </TouchableOpacity>
            </View>

            {addresses.length === 0 ? (
              <Text style={styles.empty}>No saved delivery addresses yet.</Text>
            ) : (
              addresses.map((row) => (
                <View key={row.address_id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{row.label}</Text>
                    {row.is_default ? <Text style={styles.badge}>DEFAULT</Text> : null}
                  </View>
                  <Text style={styles.value}>{row.street_address}</Text>
                  <Text style={styles.meta}>{row.city}, {row.state} {row.pincode}</Text>
                  {row.contact_person || row.contact_phone ? (
                    <Text style={styles.meta}>
                      {[row.contact_person, row.contact_phone].filter(Boolean).join(" · ")}
                    </Text>
                  ) : null}
                  <View style={styles.actionRow}>
                    <OasisButton label="Edit" variant="secondary" onPress={() => { setDraft(draftFromRow(row)); setNotice(null); }} />
                    <OasisButton
                      label={deletingId === row.address_id ? "Removing…" : "Remove"}
                      variant="secondary"
                      disabled={Boolean(deletingId)}
                      onPress={() => { void remove(row.address_id); }}
                    />
                  </View>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>{editingExisting ? "Edit address" : "Add delivery address"}</Text>
            <Field label="Label" value={draft.label} onChangeText={(value) => updateDraft("label", value)} placeholder="Warehouse / Branch / Home" />
            <Field label="Street address" value={draft.streetAddress} onChangeText={(value) => updateDraft("streetAddress", value)} placeholder="Address line" multiline />
            <Field label="City" value={draft.city} onChangeText={(value) => updateDraft("city", value)} />
            <Field label="State" value={draft.state} onChangeText={(value) => updateDraft("state", value)} />
            <Field label="Pincode" value={draft.pincode} onChangeText={(value) => updateDraft("pincode", value)} keyboardType="number-pad" />
            <Field label="Contact person" value={draft.contactPerson} onChangeText={(value) => updateDraft("contactPerson", value)} />
            <Field label="Contact phone" value={draft.contactPhone} onChangeText={(value) => updateDraft("contactPhone", value)} keyboardType="phone-pad" />

            <TouchableOpacity
              style={styles.defaultToggle}
              onPress={() => updateDraft("isDefault", !draft.isDefault)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draft.isDefault }}
            >
              <View style={[styles.checkBox, draft.isDefault && styles.checkBoxSelected]} />
              <Text style={styles.toggleText}>Use as default delivery address</Text>
            </TouchableOpacity>

            <OasisButton
              label={editingExisting ? "Save changes" : "Save address"}
              onPress={() => { void save(); }}
              loading={saving}
            />
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <BuyerServiceRequestPanel
              category="ACCOUNT"
              subject="Registered address update request"
              intro="Saved delivery addresses can be managed above. Use this governed request only when the legal/registered company address itself needs correction or approval."
              placeholder="State the registered address correction and any supporting context…"
              submitLabel="Request registered-address change"
              historyTitle="Registered-address requests"
            />
          </>
        )}
      </Screen>
    </BuyerGate>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  registeredCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surfacePremium,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  eyebrow: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXs, color: colors.textMuted, letterSpacing: 1 },
  helper: { marginTop: spacing.sm, fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, lineHeight: 18 },
  sectionHeader: { marginTop: spacing.xl, marginBottom: spacing.sm, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeLg, color: colors.textPrimary },
  link: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.action },
  empty: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  card: { marginTop: spacing.sm, padding: spacing.md, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, alignItems: "center" },
  cardTitle: { flex: 1, fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  badge: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeXs, color: colors.action },
  value: { marginTop: spacing.sm, fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, color: colors.textPrimary, lineHeight: 22 },
  meta: { marginTop: 4, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
  actionRow: { marginTop: spacing.md, gap: spacing.sm },
  field: { marginTop: spacing.sm },
  fieldLabel: { marginBottom: 6, fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textSecondary },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44, backgroundColor: colors.white, color: colors.textPrimary, fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  defaultToggle: { marginVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  checkBoxSelected: { backgroundColor: colors.action, borderColor: colors.action },
  toggleText: { flex: 1, fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, color: colors.textPrimary },
  notice: { marginTop: spacing.sm, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary },
});
