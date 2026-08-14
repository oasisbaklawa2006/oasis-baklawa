import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { colors, spacing, typography, touchTarget } from "@/theme";

interface BuyerGateProps {
  children: React.ReactNode;
  onLogin?: () => void;
  onRegister?: () => void;
  requireApprovedBuyer?: boolean;
}

export function BuyerGate({ children, onLogin, onRegister, requireApprovedBuyer = true }: BuyerGateProps) {
  const { loading, snapshot } = useBuyerSession();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.action} accessibilityLabel="Loading buyer access" />
      </View>
    );
  }

  if (!requireApprovedBuyer) {
    return <>{children}</>;
  }

  if (snapshot?.state === "approved_buyer") {
    return <>{children}</>;
  }

  const message =
    snapshot?.message ??
    (snapshot?.state === "unauthenticated"
      ? "Log in with your wholesale account to continue."
      : "Your account is not approved for buyer ordering yet.");

  return (
    <View style={styles.centered}>
      <Text style={styles.title} accessibilityRole="header">
        Buyer access required
      </Text>
      <Text style={styles.message}>{message}</Text>
      {snapshot?.state === "unauthenticated" && onLogin ? (
        <TouchableOpacity
          style={styles.button}
          onPress={onLogin}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>
      ) : null}
      {(snapshot?.state === "no_application" || snapshot?.state === "unauthenticated") && onRegister ? (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onRegister}
          accessibilityRole="button"
          accessibilityLabel="B2B trade application"
        >
          <Text style={styles.secondaryButtonText}>B2B Trade Application</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.canvas },
  title: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeXl, color: colors.textPrimary },
  message: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
  button: {
    backgroundColor: colors.action,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    minHeight: touchTarget,
    justifyContent: "center",
  },
  buttonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.action,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    minHeight: touchTarget,
    justifyContent: "center",
  },
  secondaryButtonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.action },
});
