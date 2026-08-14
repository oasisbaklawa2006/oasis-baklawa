import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, spacing, typography } from "@/theme";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  return (
    <View style={styles.centered} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator color={colors.action} size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.centered} accessibilityRole="alert">
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          style={styles.button}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.button}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface UnavailableStateProps {
  title: string;
  message: string;
}

export function UnavailableState({ title, message }: UnavailableStateProps) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorTitle: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeLg,
    color: colors.error,
    textAlign: "center",
  },
  emptyTitle: {
    fontFamily: typography.fontFamilySerifBold,
    fontSize: typography.sizeXl,
    color: colors.textPrimary,
    textAlign: "center",
  },
  message: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.action,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: typography.fontFamilySansSemiBold,
    color: colors.white,
    fontSize: typography.sizeMd,
  },
});
