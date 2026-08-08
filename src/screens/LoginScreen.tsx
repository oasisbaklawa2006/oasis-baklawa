import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { parseRpcError } from "@/lib/rpc-errors";
import { supabase } from "@/lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;
type Method = "otp" | "email" | "google";

export function LoginScreen({ navigation }: Props) {
  const { refresh } = useBuyerSession();
  const [method, setMethod] = useState<Method>("otp");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function afterAuth() {
    const snapshot = await refresh();
    if (snapshot.state === "unauthenticated") {
      navigation.replace("Welcome");
      return;
    }
    if (snapshot.state === "approved_buyer") {
      navigation.replace("Home");
      return;
    }
    if (snapshot.state === "no_application" || snapshot.state === "application_pending") {
      navigation.replace("Register");
      return;
    }
    navigation.replace("Home");
  }

  function selectMethod(nextMethod: Method) {
    setMethod(nextMethod);
    setIdentifier("");
    setOtp("");
    setOtpSent(false);
    setError(null);
  }

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({ phone: identifier });
      if (signInError) throw signInError;
      setOtpSent(true);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ phone: identifier, token: otp, type: "sms" });
      if (verifyError) throw verifyError;
      await afterAuth();
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Log In" subtitle="Mobile OTP sign-in">
      <View style={styles.tabs}>
        {(["otp", "email", "google"] as Method[]).map((m) => (
          <TouchableOpacity key={m} onPress={() => selectMethod(m)} style={[styles.tab, method === m && styles.tabActive]}>
            <Text style={[styles.tabText, method === m && styles.tabTextActive]}>
              {m === "otp" ? "Mobile OTP" : m === "email" ? "Email" : "Google"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {method === "otp" && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="+91 mobile number"
            keyboardType="phone-pad"
            value={identifier}
            onChangeText={setIdentifier}
            editable={!otpSent}
          />
          {otpSent && (
            <TextInput style={styles.input} placeholder="Enter OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} />
          )}
          <TouchableOpacity style={styles.button} disabled={busy} onPress={otpSent ? verifyOtp : sendOtp}>
            <Text style={styles.buttonText}>{otpSent ? "Verify OTP" : "Send OTP"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {method === "email" && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={identifier}
            onChangeText={setIdentifier}
          />
          <Text style={styles.methodNote}>
            Magic-link email sign-in is not configured for in-app completion in this release. Use mobile OTP to sign in here.
          </Text>
          <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
            <Text style={styles.buttonText}>Send Magic Link</Text>
          </TouchableOpacity>
        </View>
      )}

      {method === "google" && (
        <View style={styles.form}>
          <Text style={styles.methodNote}>
            Google sign-in requires native OAuth redirect configuration that is not set up in this E1 release.
          </Text>
          <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
            <Text style={styles.buttonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>New wholesale buyer? Apply for B2B trade application</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#F0DED0", alignItems: "center" },
  tabActive: { backgroundColor: "#7A1B2B" },
  tabText: { color: "#7A1B2B", fontWeight: "600", fontSize: 12 },
  tabTextActive: { color: "#FFF" },
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: "#E0C9B8", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  methodNote: { fontSize: 12, color: "#8A6B5C", lineHeight: 18 },
  button: { backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  buttonDisabled: { backgroundColor: "#B0A296" },
  buttonText: { color: "#FFF", fontWeight: "600" },
  error: { color: "#B3261E", marginTop: 12 },
  link: { color: "#7A1B2B", textAlign: "center", marginTop: 24, fontSize: 13 },
});
