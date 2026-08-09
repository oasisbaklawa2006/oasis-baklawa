import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/theme";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  scroll?: boolean;
  headerRight?: React.ReactNode;
}

export function Screen({ title, subtitle, children, scroll = true, headerRight }: ScreenProps) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {headerRight}
      </View>
      <Body style={styles.body} contentContainerStyle={scroll ? styles.scrollContent : undefined}>
        {children}
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.canvas,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: typography.fontFamilySerifBold,
    fontSize: typography.sizeXxl,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  body: { flex: 1, paddingHorizontal: spacing.lg },
  scrollContent: { paddingBottom: spacing.xl },
});
