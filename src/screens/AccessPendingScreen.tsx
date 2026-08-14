import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { openExternalUrl } from "@/lib/open-external-url";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "AccessPending">;

const SUPPORT_PHONE = "+919999792959";
const SUPPORT_WHATSAPP =
  "https://wa.me/919891162212?text=Hello%20Oasis%20Baklawa%2C%20I%20have%20submitted%20a%20trade%20access%20request%20and%20would%20like%20help%20with%20approval.";

export function AccessPendingScreen({ navigation }: Props) {
  return (
    <Screen title="Access Review" subtitle="Your application is being reviewed">
      <View style={styles.body}>
        <Text style={styles.kicker}>ACCESS REVIEW IN PROGRESS</Text>
        <Text style={styles.copy}>
          Our team verifies your business identity, GST and supporting documents before assigning your buyer
          category and confidential price grade.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What happens next</Text>
          <Text style={styles.item}>1. Business and document review</Text>
          <Text style={styles.item}>2. Buyer category and price-grade assignment</Text>
          <Text style={styles.item}>3. Account approval and private catalogue access</Text>
        </View>
        <TouchableOpacity
          style={styles.primary}
          onPress={() => openExternalUrl(`tel:${SUPPORT_PHONE}`, `Call ${SUPPORT_PHONE} for approval assistance.`)}
          accessibilityRole="button"
          accessibilityLabel="Call for approval assistance"
        >
          <Text style={styles.primaryText}>Call for approval assistance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.whatsapp}
          onPress={() => openExternalUrl(SUPPORT_WHATSAPP, "WhatsApp is not available on this device. Call support instead.")}
          accessibilityRole="button"
          accessibilityLabel="WhatsApp buyer support"
        >
          <Text style={styles.primaryText}>WhatsApp buyer support</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondary}
          onPress={() => navigation.replace("MainTabs", { screen: "Dashboard" })}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Continue exploring public catalogue</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, marginTop: spacing.lg },
  kicker: {
    fontFamily: typography.fontFamilySansSemiBold,
    letterSpacing: 2,
    fontSize: typography.sizeXs,
    color: colors.warning,
  },
  copy: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.surfacePremium,
    gap: spacing.sm,
  },
  cardTitle: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeLg,
    color: colors.textPrimary,
  },
  item: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  primary: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.textPrimary,
    minHeight: 44,
    justifyContent: "center",
  },
  whatsapp: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.success,
    minHeight: 44,
    justifyContent: "center",
  },
  primaryText: {
    fontFamily: typography.fontFamilySansSemiBold,
    textAlign: "center",
    color: colors.white,
  },
  secondary: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryText: {
    fontFamily: typography.fontFamilySansSemiBold,
    textAlign: "center",
    color: colors.textPrimary,
  },
});
