import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNetwork } from "@/context/NetworkContext";
import { colors, spacing, typography } from "@/theme";

export function OfflineBanner() {
  const { isOffline, refresh } = useNetwork();

  if (!isOffline) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>You are offline. Commerce actions are paused until connection returns.</Text>
      <TouchableOpacity
        onPress={() => void refresh()}
        accessibilityRole="button"
        accessibilityLabel="Check connection"
        style={styles.retry}
      >
        <Text style={styles.retryText}>Check connection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  text: {
    fontFamily: typography.fontFamilySansMedium,
    fontSize: typography.sizeSm,
    color: colors.warning,
    lineHeight: 18,
  },
  retry: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  retryText: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeSm,
    color: colors.textPrimary,
    textDecorationLine: "underline",
  },
});
