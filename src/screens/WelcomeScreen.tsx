import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const GREETINGS = ["Welcome", "Namaste", "स्वागत है", "خوش آمدید"];

export function WelcomeScreen({ navigation }: Props) {
  const [greetingIndex] = useState(() => Math.floor(Math.random() * GREETINGS.length));

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{GREETINGS[greetingIndex]}</Text>
      <Text style={styles.brand}>Oasis Baklawa</Text>
      <Text style={styles.tagline}>Artisan sweets, wholesale trade, delivered with quiet luxury.</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Login")}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Register")}
          accessibilityRole="button"
          accessibilityLabel="Create B2B trade account"
        >
          <Text style={styles.secondaryButtonText}>Request B2B Trade Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tertiaryButton}
          onPress={() => navigation.replace("MainTabs", { screen: "Dashboard" })}
          accessibilityRole="button"
        >
          <Text style={styles.tertiaryButtonText}>Explore public catalogue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  greeting: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, color: colors.textMuted, marginBottom: 4 },
  brand: { fontFamily: typography.fontFamilySerifBold, fontSize: 32, color: colors.textPrimary },
  tagline: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: { width: "100%", gap: spacing.md },
  primaryButton: {
    backgroundColor: colors.action,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  primaryButtonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white, fontSize: typography.sizeMd },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.textPrimary,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryButtonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.textPrimary, fontSize: typography.sizeSm },
  tertiaryButton: { paddingVertical: spacing.md, alignItems: "center" },
  tertiaryButtonText: { fontFamily: typography.fontFamilySansMedium, color: colors.action, fontSize: typography.sizeSm },
});
