import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "AccessRejected">;

const SUPPORT_PHONE = "+919999792959";

export function AccessRejectedScreen({ navigation }: Props) {
  const { snapshot } = useBuyerSession();

  return (
    <Screen title="Access Not Approved" subtitle="Trade account application">
      <View style={styles.body}>
        <Text style={styles.copy}>
          {snapshot?.message ??
            "Your trade application was not approved for buyer ordering. Contact Oasis Baklawa to discuss next steps."}
        </Text>
        <TouchableOpacity
          style={styles.primary}
          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Contact buyer support</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondary}
          onPress={() => navigation.replace("Welcome")}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Return to welcome</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, marginTop: spacing.lg },
  copy: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  primary: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.textPrimary,
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
