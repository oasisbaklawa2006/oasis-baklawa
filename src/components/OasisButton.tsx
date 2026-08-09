import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors, spacing, typography, touchTarget } from "@/theme";

interface OasisButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  accessibilityHint?: string;
  loading?: boolean;
}

export function OasisButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  accessibilityHint,
  loading = false,
}: OasisButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.action} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.primaryText : styles.secondaryText]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: touchTarget,
  },
  primary: { backgroundColor: colors.action },
  secondary: { borderWidth: 1, borderColor: colors.textPrimary, backgroundColor: "transparent" },
  disabled: { opacity: 0.55 },
  text: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd },
  primaryText: { color: colors.white },
  secondaryText: { color: colors.textPrimary },
});
