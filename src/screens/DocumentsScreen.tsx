import React from "react";
import { StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { UnavailableState } from "@/components/StateViews";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Documents">;

/** BLOCKED-BACKEND: No governed customer document list RPC exists in oasis-supabase-core yet. */
export function DocumentsScreen({ navigation }: Props) {
  return (
    <Screen title="Documents" subtitle="Invoices · Pro-forma · Transport copies">
      <Text style={styles.back} onPress={() => navigation.goBack()}>
        ‹ Back
      </Text>
      <UnavailableState
        title="Documents unavailable"
        message="A governed buyer document contract (customer_documents_v1 or equivalent) is not yet available in the backend. Invoice and transport copies will appear here once the contract is published."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    fontFamily: typography.fontFamilySansMedium,
    color: colors.action,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
