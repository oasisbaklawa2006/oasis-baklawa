import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { supabase } from "@/lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

interface TradeApplicationForm {
  companyName: string;
  gstin: string;
  contactPerson: string;
  mobile: string;
  email: string;
  city: string;
}

const EMPTY_FORM: TradeApplicationForm = {
  companyName: "",
  gstin: "",
  contactPerson: "",
  mobile: "",
  email: "",
  city: "",
};

// submit_b2b_trade_application_v1 is not yet a governed RPC in
// oasis-supabase-core — calling it would fail with an opaque PostgREST
// "function not found" error. Block submission with an honest message
// until the backend RPC exists, instead of hitting a dead endpoint.
const SUBMISSION_BACKEND_READY = false;

export function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState<TradeApplicationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof TradeApplicationForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!SUBMISSION_BACKEND_READY) {
      setError("Online trade applications aren't open yet. Please contact your Oasis Baklawa account manager to register.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("submit_b2b_trade_application_v1", {
        company_name: form.companyName,
        gstin: form.gstin,
        contact_person: form.contactPerson,
        mobile: form.mobile,
        email: form.email,
        city: form.city,
      });
      if (rpcError) throw rpcError;
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Screen title="Application Received" subtitle="B2B trade account">
        <Text style={styles.confirmation}>
          Thank you, {form.contactPerson || "buyer"}. Your trade application for {form.companyName || "your company"} has
          been submitted and is pending approval.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Login")}>
          <Text style={styles.buttonText}>Back to Log In</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <Screen title="B2B Trade Application" subtitle="Register your wholesale account">
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Company name" value={form.companyName} onChangeText={(v) => update("companyName", v)} />
        <TextInput style={styles.input} placeholder="GSTIN" autoCapitalize="characters" value={form.gstin} onChangeText={(v) => update("gstin", v)} />
        <TextInput style={styles.input} placeholder="Contact person" value={form.contactPerson} onChangeText={(v) => update("contactPerson", v)} />
        <TextInput style={styles.input} placeholder="Mobile number" keyboardType="phone-pad" value={form.mobile} onChangeText={(v) => update("mobile", v)} />
        <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => update("email", v)} />
        <TextInput style={styles.input} placeholder="City" value={form.city} onChangeText={(v) => update("city", v)} />

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
});
