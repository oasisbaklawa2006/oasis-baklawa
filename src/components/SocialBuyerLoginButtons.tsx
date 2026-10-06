import React, { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { routeFromBuyerSnapshot } from "@/lib/session-routing";
import {
  APPLE_SOCIAL_AUTH_ENABLED,
  enforceSocialBuyerEligibility,
  GOOGLE_SOCIAL_AUTH_ENABLED,
  signInBuyerWithApple,
  signInBuyerWithGoogle,
  type SocialAuthProvider,
} from "@/lib/social-buyer-auth";
import { supabase } from "@/lib/supabase";
import { colors, spacing, typography, touchTarget } from "@/theme";

export function SocialBuyerLoginButtons({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
}) {
  const { refresh } = useBuyerSession();
  const [busy, setBusy] = useState<SocialAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!GOOGLE_SOCIAL_AUTH_ENABLED && !(APPLE_SOCIAL_AUTH_ENABLED && Platform.OS === "ios")) {
    return null;
  }

  async function run(provider: SocialAuthProvider) {
    if (busy) return;
    setBusy(provider);
    setError(null);

    try {
      const attempt = provider === "google"
        ? await signInBuyerWithGoogle()
        : await signInBuyerWithApple();
      if (attempt.status === "cancelled") return;

      const decision = await enforceSocialBuyerEligibility();
      if (decision.type === "navigate") {
        if (decision.screen === "Register") {
          navigation.replace("Register");
        } else {
          navigation.replace(decision.screen, { message: decision.message });
        }
        return;
      }
      if (decision.type === "block") {
        setError(decision.message);
        return;
      }

      const snapshot = await refresh({ force: true });
      routeFromBuyerSnapshot(navigation, snapshot, true);
    } catch (e) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setError(e instanceof Error ? e.message : "Social sign-in could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.divider} />
      </View>

      {GOOGLE_SOCIAL_AUTH_ENABLED ? (
        <TouchableOpacity
          style={[styles.socialButton, busy && styles.disabled]}
          onPress={() => { void run("google"); }}
          disabled={Boolean(busy)}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Text style={styles.socialButtonText}>
            {busy === "google" ? "Connecting to Google…" : "Continue with Google"}
          </Text>
        </TouchableOpacity>
      ) : null}

      {APPLE_SOCIAL_AUTH_ENABLED && Platform.OS === "ios" ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={10}
          style={styles.appleButton}
          onPress={() => { void run("apple"); }}
        />
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Text style={styles.helper}>
        Social sign-in does not approve a trade account. Oasis re-checks your existing B2B approval before Buyer access is granted.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, gap: spacing.sm },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  divider: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerText: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
  },
  socialButton: {
    minHeight: touchTarget.minHeight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  socialButtonText: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeMd,
    color: colors.textPrimary,
  },
  appleButton: { width: "100%", height: touchTarget.minHeight },
  disabled: { opacity: 0.55 },
  error: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.danger,
    lineHeight: 20,
  },
  helper: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
