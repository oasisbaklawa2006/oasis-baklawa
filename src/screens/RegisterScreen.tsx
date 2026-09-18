import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { submitB2bAccessRequest } from "@/lib/api/buyer";
import { parseRpcError } from "@/lib/rpc-errors";
import { colors, spacing, typography, touchTarget } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

// No `city` field: submit_b2b_access_request_v2 (Core) has no p_city
// parameter and b2b_applications has no city column. If city capture becomes
// a real product requirement, that's a Core schema/RPC change — do not
// smuggle it into registered_address on the client.
interface AccessRequestForm {
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  gstNumber: string;
  registeredAddress: string;
}

const EMPTY_FORM: AccessRequestForm = {
  businessName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  gstNumber: "",
  registeredAddress: "",
};

export function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState<AccessRequestForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; duplicate: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tradeDeclaration, setTradeDeclaration] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);

  function update<K extends keyof AccessRequestForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit =
    tradeDeclaration &&
    dataConsent &&
    form.businessName.trim().length > 0 &&
    form.contactName.trim().length > 0 &&
    form.contactEmail.trim().length > 0 &&
    form.contactPhone.trim().length > 0;

  // This form works fully logged out — Request B2B Access has no
  // authentication prerequisite and grants no Buyer authority itself.
  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await submitB2bAccessRequest({
        p_business_name: form.businessName.trim(),
        p_contact_name: form.contactName.trim(),
        p_contact_email: form.contactEmail.trim(),
        p_contact_phone: form.contactPhone.trim(),
        p_gst_number: form.gstNumber.trim() || null,
        p_registered_address: form.registeredAddress.trim() || null,
        p_trade_declaration: tradeDeclaration,
        p_data_consent: dataConsent,
      });
      setResult({ status: response.application_status, duplicate: response.duplicate });
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const isApproved = result.status.toLowerCase() === "approved";
    return (
      <Screen title={result.duplicate ? "Existing Application Found" : "Application Received"} subtitle="B2B access request">
        <Text style={styles.confirmation}>
          {result.duplicate
            ? `We found an existing access request for this business — its current status is "${result.status}".`
            : `Thank you. Your access request for ${form.businessName || "your company"} has been submitted and is ${result.status}.`}
          {isApproved
            ? " You can log in now with the registered mobile number or email."
            : " Oasis Baklawa will notify you by email/WhatsApp once your request is reviewed."}
        </Text>
        {isApproved ? (
          <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Login")}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Welcome")}>
            <Text style={styles.buttonText}>Back to Welcome</Text>
          </TouchableOpacity>
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Request B2B Access" subtitle="No login required — apply for your wholesale trade account">
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Business name"
          accessibilityLabel="Business name"
          value={form.businessName}
          onChangeText={(v) => update("businessName", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Contact name"
          accessibilityLabel="Contact name"
          value={form.contactName}
          onChangeText={(v) => update("contactName", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Contact email"
          accessibilityLabel="Contact email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.contactEmail}
          onChangeText={(v) => update("contactEmail", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Contact mobile number"
          accessibilityLabel="Contact mobile number"
          keyboardType="phone-pad"
          value={form.contactPhone}
          onChangeText={(v) => update("contactPhone", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="GST number (optional)"
          accessibilityLabel="GST number"
          autoCapitalize="characters"
          value={form.gstNumber}
          onChangeText={(v) => update("gstNumber", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Registered address (optional)"
          accessibilityLabel="Registered address"
          value={form.registeredAddress}
          onChangeText={(v) => update("registeredAddress", v)}
        />

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setTradeDeclaration((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: tradeDeclaration }}
        >
          <View style={[styles.checkbox, tradeDeclaration && styles.checkboxChecked]} />
          <Text style={styles.checkboxLabel}>I confirm this is a genuine B2B trade application.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setDataConsent((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: dataConsent }}
        >
          <View style={[styles.checkbox, dataConsent && styles.checkboxChecked]} />
          <Text style={styles.checkboxLabel}>I consent to Oasis Baklawa processing my data for onboarding.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}
          disabled={!canSubmit || submitting}
          onPress={submit}
        >
          <Text style={styles.buttonText}>{submitting ? "Submitting…" : "Submit Application"}</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={() => navigation.navigate("Login")} accessibilityRole="button">
          <Text style={styles.link}>Already approved? Log in instead</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: typography.sizeMd,
    fontFamily: typography.fontFamilySans,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    minHeight: touchTarget,
  },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, minHeight: touchTarget },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: colors.action, borderRadius: 4, backgroundColor: colors.white },
  checkboxChecked: { backgroundColor: colors.action },
  checkboxLabel: { flex: 1, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, lineHeight: 18 },
  button: {
    backgroundColor: colors.action,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: spacing.sm,
    minHeight: touchTarget,
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  error: { color: colors.error, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm },
  confirmation: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, color: colors.textPrimary, lineHeight: 22, marginBottom: spacing.lg },
  link: {
    color: colors.action,
    textAlign: "center",
    marginTop: spacing.lg,
    fontSize: typography.sizeSm,
    fontFamily: typography.fontFamilySansMedium,
  },
});
