import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { storeApplicationStatus } from "@/lib/application-status-storage";
import { submitB2bTradeApplication } from "@/lib/api/buyer";
import { parseRpcError } from "@/lib/rpc-errors";
import { colors, spacing, typography, touchTarget } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

interface TradeApplicationForm {
  businessName: string;
  gstNumber: string;
  contactPerson: string;
  mobileNumber: string;
  email: string;
  city: string;
  registeredAddress: string;
}

const EMPTY_FORM: TradeApplicationForm = {
  businessName: "",
  gstNumber: "",
  contactPerson: "",
  mobileNumber: "",
  email: "",
  city: "",
  registeredAddress: "",
};

export function RegisterScreen({ navigation }: Props) {
  const { snapshot, loading, isAuthenticated, userId, refresh } = useBuyerSession();
  const [form, setForm] = useState<TradeApplicationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeDeclaration, setTradeDeclaration] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);

  function update<K extends keyof TradeApplicationForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit = tradeDeclaration && dataConsent && form.businessName.trim().length > 0;

  async function submit() {
    if (!isAuthenticated || !userId) {
      setError("Log in first so we can link your application to your account.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await submitB2bTradeApplication({
        p_business_name: form.businessName.trim(),
        p_gst_number: form.gstNumber.trim() || null,
        p_contact_person: form.contactPerson.trim() || null,
        p_mobile_number: form.mobileNumber.trim() || null,
        p_contact_email: form.email.trim() || null,
        p_city: form.city.trim() || null,
        p_registered_address: form.registeredAddress.trim() || null,
        p_trade_declaration: tradeDeclaration,
        p_data_consent: dataConsent,
      });

      if (result.application_status === "pending") {
        await storeApplicationStatus(userId, "application_pending");
      }
      await refresh();
      setSubmitted(true);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen title="B2B Trade Application" subtitle="Register your wholesale account">
        <Text style={styles.confirmation}>Checking session…</Text>
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return (
      <Screen title="B2B Trade Application" subtitle="Register your wholesale account">
        <Text style={styles.confirmation}>
          Log in with your mobile or email first. Your trade application is linked to your authenticated account.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.buttonText}>Log In to Continue</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  if (snapshot?.state === "approved_buyer") {
    return (
      <Screen title="Account Approved" subtitle="B2B trade account">
        <Text style={styles.confirmation}>Your buyer account is approved. You can browse the catalogue and place orders.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace("MainTabs", { screen: "Dashboard" })}>
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  if (snapshot?.state === "application_pending" && !submitted) {
    return (
      <Screen title="Application Pending" subtitle="B2B trade account">
        <Text style={styles.confirmation}>
          Your trade application is under review. Oasis Baklawa will notify you once your wholesale account is approved.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace("MainTabs", { screen: "Dashboard" })}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  if (submitted) {
    return (
      <Screen title="Application Received" subtitle="B2B trade account">
        <Text style={styles.confirmation}>
          Thank you, {form.contactPerson || "buyer"}. Your trade application for {form.businessName || "your company"} has
          been submitted and is pending approval.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace("MainTabs", { screen: "Dashboard" })}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <Screen title="B2B Trade Application" subtitle="Register your wholesale account">
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Business name"
          value={form.businessName}
          onChangeText={(v) => update("businessName", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="GST number"
          autoCapitalize="characters"
          value={form.gstNumber}
          onChangeText={(v) => update("gstNumber", v)}
        />
        <TextInput style={styles.input} placeholder="Contact person" value={form.contactPerson} onChangeText={(v) => update("contactPerson", v)} />
        <TextInput
          style={styles.input}
          placeholder="Mobile number"
          keyboardType="phone-pad"
          value={form.mobileNumber}
          onChangeText={(v) => update("mobileNumber", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.email}
          onChangeText={(v) => update("email", v)}
        />
        <TextInput style={styles.input} placeholder="City" value={form.city} onChangeText={(v) => update("city", v)} />
        <TextInput
          style={styles.input}
          placeholder="Registered address"
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

        <TouchableOpacity style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]} disabled={!canSubmit || submitting} onPress={submit}>
          <Text style={styles.buttonText}>{submitting ? "Submitting…" : "Submit Application"}</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
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
});
