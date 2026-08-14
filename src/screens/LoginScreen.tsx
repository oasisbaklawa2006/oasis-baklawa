import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { supabase } from "@/lib/supabase";
import { colors, spacing, typography, touchTarget } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;
type Method = "otp" | "email" | "google";

export function LoginScreen({ navigation }: Props) {
  const [method, setMethod] = useState<Method>("otp");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({ phone: identifier });
      if (signInError) throw signInError;
      setOtpSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send OTP");
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
      navigation.replace("MainTabs", { screen: "Dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setBusy(false);
    }
  }

  async function loginWithEmail() {
    setBusy(true);
    setError(null);
    try {
      const { error: linkError } = await supabase.auth.signInWithOtp({ email: identifier });
      if (linkError) throw linkError;
      setOtpSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send magic link");
    } finally {
      setBusy(false);
    }
  }

  async function loginWithGoogle() {
    setBusy(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (oauthError) throw oauthError;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  function selectMethod(nextMethod: Method) {
    setMethod(nextMethod);
    setIdentifier("");
    setOtp("");
    setOtpSent(false);
    setError(null);
  }

  return (
    <Screen title="Log In" subtitle="MSG91 OTP, Email or Google">
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["otp", "email", "google"] as Method[]).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => selectMethod(m)}
            style={[styles.tab, method === m && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: method === m }}
            accessibilityLabel={m === "otp" ? "Mobile OTP" : m === "email" ? "Email" : "Google"}
          >
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
            accessibilityLabel="Mobile number"
          />
          {otpSent && (
            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              accessibilityLabel="One-time password"
            />
          )}
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={otpSent ? verifyOtp : sendOtp}
            accessibilityRole="button"
            accessibilityLabel={otpSent ? "Verify OTP" : "Send OTP"}
          >
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
            accessibilityLabel="Email address"
          />
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={loginWithEmail}
            accessibilityRole="button"
            accessibilityLabel={otpSent ? "Magic link sent" : "Send magic link"}
          >
            <Text style={styles.buttonText}>{otpSent ? "Magic Link Sent" : "Send Magic Link"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {method === "google" && (
        <View style={styles.form}>
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={loginWithGoogle}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <Text style={styles.buttonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={() => navigation.navigate("Register")}
        accessibilityRole="button"
        accessibilityLabel="Apply for B2B trade account"
      >
        <Text style={styles.link}>New wholesale buyer? Apply for B2B trade account</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfacePremium,
    alignItems: "center",
    minHeight: touchTarget,
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.action },
  tabText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.action, fontSize: typography.sizeXs },
  tabTextActive: { color: colors.white },
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
  button: {
    backgroundColor: colors.action,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    minHeight: touchTarget,
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  error: { color: colors.error, marginTop: spacing.md, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm },
  link: {
    color: colors.action,
    textAlign: "center",
    marginTop: spacing.lg,
    fontSize: typography.sizeSm,
    fontFamily: typography.fontFamilySansMedium,
  },
});
