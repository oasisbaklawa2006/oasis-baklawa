import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { UnavailableState } from "@/components/StateViews";
import { QUOTE_BACKEND_UNAVAILABLE_MESSAGE } from "@/lib/quote-guards";
import { isQuoteBackendAvailable } from "@/types/quote-contract";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Quotations">;

export function QuotationsScreen({ navigation }: Props) {
  const backendAvailable = isQuoteBackendAvailable();

  return (
    <BuyerGate>
      <Screen title="Quotations" subtitle="Request, review, and respond to governed quotations">
        {backendAvailable ? (
          <UnavailableState
            title="Quotations unavailable"
            message="Quotation history could not be loaded. Check your connection and try again."
          />
        ) : (
          <View style={styles.blocked}>
            <UnavailableState
              title="Quotation flow pending Core contracts"
              message={QUOTE_BACKEND_UNAVAILABLE_MESSAGE}
            />
            <Text style={styles.note}>
              Buyer never invents price, tax, credit, lead time, validity, or approval. Quotations will appear here once
              Core publishes governed customer quotation RPCs.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate("MainTabs", { screen: "Support" })}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, gap: spacing.md },
  note: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeSm,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  button: {
    alignSelf: "center",
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
