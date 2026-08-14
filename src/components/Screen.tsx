import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ResponsiveContainer } from "@/components/ResponsiveContainer";
import { colors, spacing, typography } from "@/theme";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  scroll?: boolean;
  headerRight?: React.ReactNode;
  safeAreaEdges?: Edge[];
}

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  headerRight,
  safeAreaEdges = ["top"],
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  const appliesBottomInset = !safeAreaEdges.includes("bottom");
  const bottomInset = appliesBottomInset ? insets.bottom : 0;
  return (
    <SafeAreaView style={styles.safeArea} edges={safeAreaEdges}>
      <OfflineBanner />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {headerRight}
      </View>
      <ResponsiveContainer style={styles.responsive}>
        <Body
          style={[styles.body, !scroll && styles.bodyPadded, !scroll && { paddingBottom: bottomInset }]}
          contentContainerStyle={scroll ? [styles.scrollContent, { paddingBottom: spacing.xl + bottomInset }] : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </Body>
      </ResponsiveContainer>
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
  responsive: { flex: 1 },
  body: { flex: 1 },
  bodyPadded: { paddingHorizontal: spacing.lg },
  scrollContent: { paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
});
