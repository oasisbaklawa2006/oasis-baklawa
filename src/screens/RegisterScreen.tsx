import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { storeApplicationStatus } from "@/lib/application-status-storage";
import { submitB2bTradeApplication } from "@/lib/api/buyer";
import { parseRpcError } from "@/lib/rpc-errors";
import { supabase } from "@/lib/supabase";

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
  const { snapshot, refresh } = useBuyerSession();
  const [form, setForm] = useState<TradeApplicationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(Boolean(data.session));
      setAuthChecked(true);
    })();
  }, []);

  function update<K extends keyof TradeApplicationForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!isAuthenticated) {
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
        p_trade_declaration: true,
        p_data_consent: true,
      });

      if (result.application_status === "pending") {
        await storeApplicationStatus("application_pending");
      }
      await refresh();
      setSubmitted(true);
    } catch (e) {
      setError(parseRpcError(e instanceof Error ? e : null).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) {
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
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Home")}>
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
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Home")}>
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
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Home")}>
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

        <Text style={styles.consent}>
          By submitting, you accept the trade terms and consent to data processing for B2B onboarding.
        </Text>

        <TouchableOpacity style={styles.button} disabled={submitting} onPress={submit}>
          <Text style={styles.buttonText}>{submitting ? "Submitting…" : "Submit Application"}</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: "#E0C9B8", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  button: { backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#FFF", fontWeight: "600" },
  error: { color: "#B3261E" },
  confirmation: { fontSize: 15, color: "#3A2A22", lineHeight: 22, marginBottom: 24 },
  consent: { fontSize: 12, color: "#8A6B5C", lineHeight: 18 },
});
