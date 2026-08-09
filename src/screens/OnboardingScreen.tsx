import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { ResponsiveContainer } from "@/components/ResponsiveContainer";
import { markOnboardingComplete } from "@/lib/onboarding-storage";
import { colors, spacing, typography, touchTarget } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const STEPS = [
  {
    kicker: "DISCOVER OASIS",
    title: "Browse the artisan catalogue",
    body: "Explore published collections publicly. Confidential trade pricing unlocks only after buyer approval.",
  },
  {
    kicker: "GOVERNED PRICING",
    title: "Approved buyers see their price grade",
    body: "MOQ, carton rules and your assigned trade prices come from governed backend contracts — never client guesses.",
  },
  {
    kicker: "ORDER & REORDER",
    title: "Build a server-backed draft cart",
    body: "Add products, validate quantities, and submit a Sales Order once. Your draft persists across sessions.",
  },
  {
    kicker: "TRACK & SUPPORT",
    title: "Follow fulfilment and raise tickets",
    body: "Track order progress, view line items, and contact Oasis support without chasing routine updates.",
  },
] as const;

export function OnboardingScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  async function finish() {
    await markOnboardingComplete();
    navigation.replace("Welcome");
  }

  function next() {
    if (isLast) {
      void finish();
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <View style={styles.container}>
      <ResponsiveContainer>
        <View style={styles.body}>
          <TouchableOpacity
            onPress={() => void finish()}
            style={styles.skip}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <Text style={styles.kicker}>{step.kicker}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {step.title}
          </Text>
          <Text style={styles.bodyText}>{step.body}</Text>

          <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity
            style={styles.primary}
            onPress={next}
            accessibilityRole="button"
            accessibilityLabel={isLast ? "Get started" : "Next"}
          >
            <Text style={styles.primaryText}>{isLast ? "Get started" : "Next"}</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  body: { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  skip: { alignSelf: "flex-end", minHeight: touchTarget, justifyContent: "center" },
  skipText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.action, fontSize: typography.sizeMd },
  kicker: {
    fontFamily: typography.fontFamilySansSemiBold,
    letterSpacing: 2,
    fontSize: typography.sizeXs,
    color: colors.accentGold,
    marginTop: spacing.lg,
  },
  title: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeDisplay, color: colors.textPrimary, lineHeight: 40 },
  bodyText: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeLg, lineHeight: 26, color: colors.textSecondary },
  dots: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.action, width: 24 },
  primary: {
    backgroundColor: colors.action,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    marginTop: spacing.lg,
    minHeight: touchTarget,
    justifyContent: "center",
  },
  primaryText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white, fontSize: typography.sizeMd },
});
