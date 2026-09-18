import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { routeFromBuyerSnapshot } from "@/lib/session-routing";
import { invokeBuyerPreflight, type BuyerPreflightChannel, type BuyerPreflightState } from "@/lib/buyer-preflight";
import { decideLoginAction } from "@/lib/login-preflight-action";
import { isEmailIdentifier, normalizeEmail, normalizePhone } from "@/lib/buyer-identity";
import { sendMsg91Otp, verifyMsg91Otp, retryMsg91Otp } from "@/lib/msg91-otp-widget";
import { bridgeMsg91SessionAndClaim } from "@/lib/buyer-session-bridge";
import { openExternalUrl } from "@/lib/open-external-url";
import { colors, spacing, typography, touchTarget } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;
type Channel = BuyerPreflightChannel;
type Stage = "identifier" | "otp";

const SUPPORT_PHONE = "+919999792959";
const SUPPORT_WHATSAPP =
  "https://wa.me/919891162212?text=Hello%20Oasis%20Baklawa%2C%20I%20need%20help%20logging%20in.";

function createAttemptId(): string {
  return `native-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function LoginScreen({ navigation }: Props) {
  const { refresh } = useBuyerSession();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<Stage>("identifier");
  const [reqId, setReqId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedState, setBlockedState] = useState<BuyerPreflightState | null>(null);

  function resetChannel() {
    setChannel(null);
    setIdentifier("");
    setOtp("");
    setStage("identifier");
    setReqId(null);
    setError(null);
    setBlockedState(null);
  }

  function validatedIdentifier(targetChannel: Channel): string | null {
    if (targetChannel === "email") {
      const normalized = normalizeEmail(identifier);
      return isEmailIdentifier(normalized) ? normalized : null;
    }
    const phone = normalizePhone(identifier);
    // MSG91's SDK and buyer-login-gateway both expect "<country code><10 digits>"
    // with no '+' — e.g. "9198XXXXXXXX".
    return phone.last10.length === 10 ? `91${phone.last10}` : null;
  }

  async function requestOtp(targetChannel: Channel) {
    setError(null);
    setBlockedState(null);
    const normalized = validatedIdentifier(targetChannel);
    if (!normalized) {
      setError(
        targetChannel === "email"
          ? "Enter a valid email address."
          : "Enter a valid 10-digit mobile number."
      );
      return;
    }

    setBusy(true);
    const attemptId = createAttemptId();
    try {
      // Preflight is authoritative and MUST run before any OTP is requested.
      // No eligibility rule is reconstructed on-device.
      const preflight = await invokeBuyerPreflight(targetChannel, normalized, attemptId);
      const action = decideLoginAction(preflight);
      if (action.type === "navigate") {
        setBusy(false);
        navigation.replace(action.screen, action.screen === "Register" ? undefined : { message: action.message });
        return;
      }
      if (action.type === "inline_block") {
        setBusy(false);
        setBlockedState(action.state);
        setError(action.message);
        return;
      }
      // action.type === "send_otp" — the ONLY path that reaches MSG91.

      const sendResult = await sendMsg91Otp(normalized);
      if (sendResult.invisibleVerified && sendResult.accessToken) {
        await completeLogin(targetChannel, sendResult.accessToken, normalized, attemptId);
        return;
      }
      setReqId(sendResult.reqId);
      setIdentifier(normalized);
      setStage("otp");
    } catch (e) {
      setError(e instanceof Error ? mapMsg91Error(e.message) : "Could not send OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(targetChannel: Channel) {
    if (!reqId) {
      setError("OTP session expired. Please request a new code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const accessToken = await verifyMsg91Otp(reqId, otp);
      await completeLogin(targetChannel, accessToken, identifier, createAttemptId());
    } catch (e) {
      setError(e instanceof Error ? mapMsg91Error(e.message) : "Invalid OTP. Please try again.");
      setBusy(false);
    }
  }

  async function completeLogin(targetChannel: Channel, accessToken: string, normalizedIdentifier: string, attemptId: string) {
    try {
      await bridgeMsg91SessionAndClaim(targetChannel, accessToken, normalizedIdentifier, attemptId);
      const snapshot = await refresh();
      routeFromBuyerSnapshot(navigation, snapshot, true);
    } catch (e) {
      setError(e instanceof Error ? mapSessionError(e.message) : "We couldn't complete sign-in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp(targetChannel: Channel) {
    if (!reqId) return;
    setBusy(true);
    setError(null);
    try {
      await retryMsg91Otp(reqId, targetChannel === "mobile" ? "SMS-11" : "EMAIL-3");
    } catch (e) {
      setError(e instanceof Error ? mapMsg91Error(e.message) : "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Buyer Log In" subtitle="Use the mobile number or email approved with your Oasis B2B access request">
      {channel === null && (
        <View style={styles.form}>
          <TouchableOpacity
            style={styles.choiceCard}
            onPress={() => setChannel("mobile")}
            accessibilityRole="button"
            accessibilityLabel="Mobile OTP"
          >
            <Text style={styles.choiceTitle}>Mobile OTP</Text>
            <Text style={styles.choiceSubtitle}>Approved buyers verify through MSG91.</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.choiceCard}
            onPress={() => setChannel("email")}
            accessibilityRole="button"
            accessibilityLabel="Email OTP"
          >
            <Text style={styles.choiceTitle}>Email OTP</Text>
            <Text style={styles.choiceSubtitle}>Approved buyers verify through MSG91 email OTP.</Text>
          </TouchableOpacity>
        </View>
      )}

      {channel !== null && (
        <View style={styles.form}>
          <TouchableOpacity onPress={resetChannel} accessibilityRole="button" accessibilityLabel="Change login method">
            <Text style={styles.backLink}>‹ Change login method</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={channel === "mobile" ? "10-digit mobile number" : "you@company.com"}
            keyboardType={channel === "mobile" ? "phone-pad" : "email-address"}
            autoCapitalize="none"
            value={identifier}
            onChangeText={setIdentifier}
            editable={stage === "identifier"}
            accessibilityLabel={channel === "mobile" ? "Mobile number" : "Email address"}
          />

          {stage === "otp" && (
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 8))}
              accessibilityLabel="One-time password"
            />
          )}

          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={() => (stage === "identifier" ? requestOtp(channel) : verifyOtp(channel))}
            accessibilityRole="button"
            accessibilityLabel={stage === "identifier" ? "Continue with OTP" : "Verify and continue"}
          >
            <Text style={styles.buttonText}>
              {busy ? "Please wait…" : stage === "identifier" ? "Continue with OTP" : "Verify and continue"}
            </Text>
          </TouchableOpacity>

          {stage === "otp" && (
            <TouchableOpacity onPress={() => resendOtp(channel)} disabled={busy} accessibilityRole="button">
              <Text style={styles.link}>Resend code</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {error ? (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.error}>{error}</Text>
          {blockedState === "employee" && (
            <Text style={styles.errorHint}>
              This identifier belongs to an Oasis employee account. Employees authenticate through Admin Login
              (registered work email and password), not the Buyer App.
            </Text>
          )}
          {blockedState === "ambiguous" && (
            <TouchableOpacity
              style={styles.errorAction}
              onPress={() =>
                openExternalUrl(SUPPORT_WHATSAPP, "WhatsApp is not available on this device. Call support instead.")
              }
              accessibilityRole="button"
            >
              <Text style={styles.errorActionText}>Contact Oasis support</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          accessibilityRole="button"
          accessibilityLabel="Request B2B access"
        >
          <Text style={styles.link}>New wholesale buyer? Request B2B Access</Text>
        </TouchableOpacity>
        <View style={styles.supportRow}>
          <TouchableOpacity
            onPress={() => openExternalUrl(SUPPORT_WHATSAPP, "WhatsApp is not available on this device.")}
            accessibilityRole="button"
          >
            <Text style={styles.supportLink}>WhatsApp Oasis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openExternalUrl(`tel:${SUPPORT_PHONE}`, `Call ${SUPPORT_PHONE}`)}
            accessibilityRole="button"
          >
            <Text style={styles.supportLink}>Call Oasis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

function mapMsg91Error(raw: string): string {
  if (raw === "msg91_widget_not_configured") {
    return "OTP login isn't available on this build yet. Please contact Oasis support.";
  }
  if (raw === "msg91_send_failed") return "We couldn't send a code to that number/email. Please try again.";
  if (raw === "msg91_verify_failed") return "That code didn't match. Please try again.";
  return raw;
}

function mapSessionError(raw: string): string {
  if (raw.startsWith("APPROVED_B2B_IDENTITY_CLAIM_FAILED")) {
    return "We verified your code but couldn't activate your buyer account. Please contact Oasis support.";
  }
  if (
    raw === "session_token_missing" ||
    raw === "session_create_failed" ||
    raw === "session_identity_mismatch"
  ) {
    return "We couldn't complete sign-in safely. Please try again or contact Oasis support.";
  }
  return raw;
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  choiceCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    backgroundColor: colors.white,
  },
  choiceTitle: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  choiceSubtitle: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, marginTop: 4 },
  backLink: { fontFamily: typography.fontFamilySansSemiBold, color: colors.textMuted, fontSize: typography.sizeSm },
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
  otpInput: { textAlign: "center", letterSpacing: 4 },
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
  errorBox: { marginTop: spacing.md, gap: spacing.sm },
  error: { color: colors.error, fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm },
  errorHint: { color: colors.textSecondary, fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs },
  errorAction: {
    alignSelf: "flex-start",
    backgroundColor: colors.action,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  errorActionText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white, fontSize: typography.sizeXs },
  footer: { marginTop: spacing.xl, gap: spacing.md, alignItems: "center" },
  supportRow: { flexDirection: "row", gap: spacing.lg },
  supportLink: { color: colors.textMuted, fontSize: typography.sizeXs, fontFamily: typography.fontFamilySansMedium },
  link: {
    color: colors.action,
    textAlign: "center",
    fontSize: typography.sizeSm,
    fontFamily: typography.fontFamilySansMedium,
  },
});
